import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { compare } from "bcrypt";
import { authOptions } from "@/lib/auth";
import { getUserAdminStatus,hasAdminAccessByEmail,hasSuperAdminAccessByEmail,isConfiguredAdminEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export async function GET(request:Request){
  const session=await getServerSession(authOptions);
  if(!session?.user?.email||!(await hasAdminAccessByEmail(session.user.email)))return NextResponse.json({error:"Unauthorized"},{status:401});
  const query=new URL(request.url).searchParams.get("q")?.trim()||"";
  const where=query?{email:{contains:query,mode:Prisma.QueryMode.insensitive}}:{};
  const [users,events]=await Promise.all([
    db.user.findMany({where,take:500,orderBy:{createdAt:"desc"},select:{id:true,email:true,role:true,isAdmin:true,lastLoginAt:true,landingEvents:{select:{createdAt:true},orderBy:{createdAt:"desc"},take:1},gymAccesses:{select:{id:true,gym:{select:{id:true,name:true}}}}}}),
    db.landingEvent.findMany({where:{eventType:{in:["DAY_PASS_CLICKED","DAY_PASS_CLAIM_CONFIRMED","DAY_PASS_SIGNUP"]}},select:{eventType:true,userId:true,visitorId:true},take:100_000}),
  ]);
  const visitorUsers=new Map(events.filter(event=>event.userId).map(event=>[event.visitorId,event.userId!]));
  const activity=new Map<string,{dayPassClicks:number;confirmedDayPasses:number}>();
  for(const event of events){const userId=event.userId||visitorUsers.get(event.visitorId);if(!userId)continue;const totals=activity.get(userId)||{dayPassClicks:0,confirmedDayPasses:0};if(event.eventType==="DAY_PASS_CLICKED")totals.dayPassClicks++;if(event.eventType==="DAY_PASS_CLAIM_CONFIRMED")totals.confirmedDayPasses++;activity.set(userId,totals)}
  return NextResponse.json({canManageUsers:await hasSuperAdminAccessByEmail(session.user.email),users:users.filter(user=>user.email?.toLowerCase()!==session.user.email?.toLowerCase()).map(user=>{const latestEvent=user.landingEvents[0]?.createdAt;const lastActiveAt=latestEvent&&(!user.lastLoginAt||latestEvent>user.lastLoginAt)?latestEvent:user.lastLoginAt;return {id:user.id,email:user.email,role:user.role,hasAdminAccess:getUserAdminStatus(user),isConfiguredAdmin:isConfiguredAdminEmail(user.email),gymAccessCount:user.gymAccesses.length,gyms:user.gymAccesses.map(access=>access.gym),lastActiveAt:lastActiveAt?.toISOString()||null,...(activity.get(user.id)||{dayPassClicks:0,confirmedDayPasses:0})}})});
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasSuperAdminAccessByEmail(session.user.email))) {
    return NextResponse.json({ error: "Only the superadmin can change admin access." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const userIds: string[] = Array.isArray(body.userIds)
    ? Array.from(new Set<string>(body.userIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0))).slice(0, 500)
    : [];
  if (userIds.length) {
    const password = typeof body.password === "string" ? body.password : "";
    const isAdmin = typeof body.isAdmin === "boolean" ? body.isAdmin : null;
    if (isAdmin === null) return NextResponse.json({ error: "Admin status is required." }, { status: 400 });
    const currentAdmin = await db.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { password: true } });
    if (!password || !currentAdmin?.password || !(await compare(password, currentAdmin.password))) return NextResponse.json({ error: "The admin password is incorrect." }, { status: 401 });
    const targets = await db.user.findMany({ where: { id: { in: userIds } }, select: { email: true } });
    if (!isAdmin && targets.some(target => isConfiguredAdminEmail(target.email))) return NextResponse.json({ error: "Configured superadmins cannot be demoted here." }, { status: 409 });
    const result = await db.user.updateMany({ where: { id: { in: userIds } }, data: { isAdmin } });
    return NextResponse.json({ ok: true, count: result.count });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const isAdmin = typeof body.isAdmin === "boolean" ? body.isAdmin : null;
  if (!userId || isAdmin === null) return NextResponse.json({ error: "User and admin status are required." }, { status: 400 });
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (isConfiguredAdminEmail(target.email)) return NextResponse.json({ error: "Configured admin access is managed through ADMIN_EMAILS." }, { status: 409 });
  await db.user.update({ where: { id: userId }, data: { isAdmin } });
  return NextResponse.json({ ok: true, isAdmin });
}
