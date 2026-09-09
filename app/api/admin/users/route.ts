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
    db.landingEvent.findMany({where:{eventType:{in:["DAY_PASS_CLICKED","DAY_PASS_CLAIM_CONFIRMED","DAY_PASS_GYM_CONFIRMED","DAY_PASS_SIGNUP","MEMBERSHIP_CLICKED","MEMBERSHIP_CLAIM_CONFIRMED","MEMBERSHIP_GYM_CONFIRMED","MEMBERSHIP_SIGNUP"]}},select:{id:true,eventType:true,userId:true,visitorId:true,visitId:true,gymId:true,metadata:true,createdAt:true,gym:{select:{name:true}}},take:100_000}),
  ]);
  const visitorUsers=new Map(events.filter(event=>event.userId).map(event=>[event.visitorId,event.userId!]));
  const activity=new Map<string,{dayPassClicks:number;confirmedDayPasses:number;membershipClicks:number;confirmedMemberships:number}>();
  const confirmedDayPasses=new Map<string,Set<string>>(),confirmedMemberships=new Map<string,Set<string>>();
  type ClaimConfirmation={gymId:string;gymName:string;claimType:"day-pass"|"membership";gymConfirmed:boolean};
  const claimConfirmations=new Map<string,Map<string,ClaimConfirmation>>();
  for(const event of events){const userId=event.userId||visitorUsers.get(event.visitorId);if(!userId)continue;const totals=activity.get(userId)||{dayPassClicks:0,confirmedDayPasses:0,membershipClicks:0,confirmedMemberships:0};if(event.eventType==="DAY_PASS_CLICKED")totals.dayPassClicks++;if(event.eventType==="MEMBERSHIP_CLICKED")totals.membershipClicks++;activity.set(userId,totals);if(event.gymId&&(event.eventType==="DAY_PASS_CLICKED"||event.eventType==="MEMBERSHIP_CLICKED")){const claimType=event.eventType==="DAY_PASS_CLICKED"?"day-pass":"membership",key=`${claimType}:${event.gymId}`,byUser=claimConfirmations.get(userId)||new Map<string,ClaimConfirmation>();if(!byUser.has(key))byUser.set(key,{gymId:event.gymId,gymName:event.gym?.name||"Deleted gym",claimType,gymConfirmed:false});claimConfirmations.set(userId,byUser)}}
  for(const event of events){const userId=event.userId||visitorUsers.get(event.visitorId);if(!userId)continue;const clickType=event.eventType.startsWith("MEMBERSHIP_")?"MEMBERSHIP_CLICKED":"DAY_PASS_CLICKED",metadata=event.metadata as Record<string,unknown>|null,claimKey=event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string"?metadata.claimClickId:events.filter(click=>click.eventType===clickType&&click.gymId===event.gymId&&(click.userId||visitorUsers.get(click.visitorId))===userId&&click.createdAt<=event.createdAt).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())[0]?.id||event.id;if(["DAY_PASS_CLAIM_CONFIRMED","DAY_PASS_GYM_CONFIRMED"].includes(event.eventType)){const values=confirmedDayPasses.get(userId)||new Set<string>();values.add(claimKey);confirmedDayPasses.set(userId,values)}if(["MEMBERSHIP_CLAIM_CONFIRMED","MEMBERSHIP_GYM_CONFIRMED"].includes(event.eventType)){const values=confirmedMemberships.get(userId)||new Set<string>();values.add(claimKey);confirmedMemberships.set(userId,values)}if(event.gymId&&(event.eventType==="DAY_PASS_GYM_CONFIRMED"||event.eventType==="MEMBERSHIP_GYM_CONFIRMED")){const claimType=event.eventType==="DAY_PASS_GYM_CONFIRMED"?"day-pass":"membership",confirmation=claimConfirmations.get(userId)?.get(`${claimType}:${event.gymId}`);if(confirmation)confirmation.gymConfirmed=true}}
  for(const [userId,totals] of activity){totals.confirmedDayPasses=confirmedDayPasses.get(userId)?.size||0;totals.confirmedMemberships=confirmedMemberships.get(userId)?.size||0}
  return NextResponse.json({canManageUsers:await hasSuperAdminAccessByEmail(session.user.email),users:users.filter(user=>user.email?.toLowerCase()!==session.user.email?.toLowerCase()).map(user=>{const latestEvent=user.landingEvents[0]?.createdAt;const lastActiveAt=latestEvent&&(!user.lastLoginAt||latestEvent>user.lastLoginAt)?latestEvent:user.lastLoginAt;return {id:user.id,email:user.email,role:user.role,hasAdminAccess:getUserAdminStatus(user),isConfiguredAdmin:isConfiguredAdminEmail(user.email),gymAccessCount:user.gymAccesses.length,gyms:user.gymAccesses.map(access=>access.gym),claimConfirmations:[...(claimConfirmations.get(user.id)?.values()||[])].sort((a,b)=>a.gymName.localeCompare(b.gymName)||a.claimType.localeCompare(b.claimType)),lastActiveAt:lastActiveAt?.toISOString()||null,...(activity.get(user.id)||{dayPassClicks:0,confirmedDayPasses:0,membershipClicks:0,confirmedMemberships:0})}})});
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => ({}));
  if (body.action === "setGymClaimConfirmation") {
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId=typeof body.userId==="string"?body.userId:"",gymId=typeof body.gymId==="string"?body.gymId:"",claimType=body.claimType==="membership"?"membership":body.claimType==="day-pass"?"day-pass":null,confirmed=typeof body.confirmed==="boolean"?body.confirmed:null;
    if(!userId||!gymId||!claimType||confirmed===null)return NextResponse.json({error:"User, gym, claim type, and confirmation state are required."},{status:400});
    const clickType=claimType==="membership"?"MEMBERSHIP_CLICKED":"DAY_PASS_CLICKED",confirmationType=claimType==="membership"?"MEMBERSHIP_GYM_CONFIRMED":"DAY_PASS_GYM_CONFIRMED";
    const click=await db.landingEvent.findFirst({where:{eventType:clickType,userId,gymId},orderBy:{createdAt:"desc"},select:{id:true,visitorId:true,visitId:true}});
    if(!click)return NextResponse.json({error:"No matching claim click was found for this user and gym."},{status:409});
    await db.$transaction(async tx=>{await tx.landingEvent.deleteMany({where:{eventType:confirmationType,userId,gymId}});if(confirmed)await tx.landingEvent.create({data:{eventType:confirmationType,visitorId:click.visitorId,visitId:`gym-confirm:${click.id}`,path:"/admin",gymId,userId,metadata:{claimClickId:click.id,confirmedBy:session.user!.email!.toLowerCase(),confirmedAt:new Date().toISOString()}}})});
    const confirmationTypes=claimType==="membership"?["MEMBERSHIP_CLAIM_CONFIRMED","MEMBERSHIP_GYM_CONFIRMED"]:["DAY_PASS_CLAIM_CONFIRMED","DAY_PASS_GYM_CONFIRMED"],[confirmationEvents,claimClicks]=await Promise.all([db.landingEvent.findMany({where:{eventType:{in:confirmationTypes},userId},select:{id:true,eventType:true,gymId:true,metadata:true,createdAt:true}}),db.landingEvent.findMany({where:{eventType:clickType,userId},select:{id:true,gymId:true,createdAt:true}})]),combinedConfirmed=new Set(confirmationEvents.map(event=>{const metadata=event.metadata as Record<string,unknown>|null;if(event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string")return metadata.claimClickId;return claimClicks.filter(item=>item.gymId===event.gymId&&item.createdAt<=event.createdAt).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime())[0]?.id||event.id})).size;
    return NextResponse.json({ok:true,gymConfirmed:confirmed,combinedConfirmed});
  }
  if (body.action === "setGymClaimLogConfirmation") {
    if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const claimClickId=typeof body.claimClickId==="string"?body.claimClickId:"",confirmed=typeof body.confirmed==="boolean"?body.confirmed:null;
    if(!claimClickId||confirmed===null)return NextResponse.json({error:"Claim click and confirmation state are required."},{status:400});
    const click=await db.landingEvent.findUnique({where:{id:claimClickId},select:{id:true,eventType:true,visitorId:true,gymId:true,userId:true}});
    if(!click||!click.gymId||!["DAY_PASS_CLICKED","MEMBERSHIP_CLICKED"].includes(click.eventType))return NextResponse.json({error:"The claim click could not be found."},{status:404});
    const confirmationType=click.eventType==="MEMBERSHIP_CLICKED"?"MEMBERSHIP_GYM_CONFIRMED":"DAY_PASS_GYM_CONFIRMED",confirmationVisitId=`gym-confirm:${click.id}`;
    await db.$transaction(async tx=>{await tx.landingEvent.deleteMany({where:{eventType:confirmationType,visitId:confirmationVisitId}});if(confirmed)await tx.landingEvent.create({data:{eventType:confirmationType,visitorId:click.visitorId,visitId:confirmationVisitId,path:"/admin",gymId:click.gymId,userId:click.userId,metadata:{claimClickId:click.id,confirmedBy:session.user!.email!.toLowerCase(),confirmedAt:new Date().toISOString()}}})});
    return NextResponse.json({ok:true,gymConfirmed:confirmed});
  }
  if (!session?.user?.email || !(await hasSuperAdminAccessByEmail(session.user.email))) {
    return NextResponse.json({ error: "Only the superadmin can change admin access." }, { status: 403 });
  }
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
