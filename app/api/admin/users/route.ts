import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getUserAdminStatus,hasAdminAccessByEmail,hasSuperAdminAccessByEmail,isConfiguredAdminEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export async function GET(request:Request){const session=await getServerSession(authOptions);if(!session?.user?.email||!(await hasAdminAccessByEmail(session.user.email)))return NextResponse.json({error:"Unauthorized"},{status:401});const query=new URL(request.url).searchParams.get("q")?.trim()||"";const where=query?{OR:[{username:{contains:query,mode:Prisma.QueryMode.insensitive}},{name:{contains:query,mode:Prisma.QueryMode.insensitive}},{email:{contains:query,mode:Prisma.QueryMode.insensitive}}]}:{};const users=await db.user.findMany({where,take:500,orderBy:{createdAt:"desc"},select:{id:true,username:true,name:true,email:true,role:true,isAdmin:true,lastLoginAt:true,gymAccesses:{select:{id:true}}}});return NextResponse.json({canManageUsers:await hasSuperAdminAccessByEmail(session.user.email),users:users.filter(u=>u.email?.toLowerCase()!==session.user.email?.toLowerCase()).map(u=>({id:u.id,username:u.username,name:u.name,email:u.email,role:u.role,hasAdminAccess:getUserAdminStatus(u),isConfiguredAdmin:isConfiguredAdminEmail(u.email),gymAccessCount:u.gymAccesses.length,lastActiveAt:u.lastLoginAt?.toISOString()||null,eventCount:0}))})}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasSuperAdminAccessByEmail(session.user.email))) {
    return NextResponse.json({ error: "Only the superadmin can change admin access." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const isAdmin = typeof body.isAdmin === "boolean" ? body.isAdmin : null;
  if (!userId || isAdmin === null) return NextResponse.json({ error: "User and admin status are required." }, { status: 400 });
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (isConfiguredAdminEmail(target.email)) return NextResponse.json({ error: "Configured admin access is managed through ADMIN_EMAILS." }, { status: 409 });
  await db.user.update({ where: { id: userId }, data: { isAdmin } });
  return NextResponse.json({ ok: true, isAdmin });
}
