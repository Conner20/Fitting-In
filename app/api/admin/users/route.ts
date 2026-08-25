import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getUserAdminStatus,hasAdminAccessByEmail,hasSuperAdminAccessByEmail,isConfiguredAdminEmail } from "@/lib/admin";
import { db } from "@/prisma/client";

export async function GET(request:Request){const session=await getServerSession(authOptions);if(!session?.user?.email||!(await hasAdminAccessByEmail(session.user.email)))return NextResponse.json({error:"Unauthorized"},{status:401});const query=new URL(request.url).searchParams.get("q")?.trim()||"";const where=query?{OR:[{username:{contains:query,mode:Prisma.QueryMode.insensitive}},{name:{contains:query,mode:Prisma.QueryMode.insensitive}},{email:{contains:query,mode:Prisma.QueryMode.insensitive}}]}:{};const users=await db.user.findMany({where,take:500,orderBy:{createdAt:"desc"},select:{id:true,username:true,name:true,email:true,role:true,isAdmin:true,lastLoginAt:true,gymAccesses:{select:{id:true}}}});return NextResponse.json({canManageUsers:await hasSuperAdminAccessByEmail(session.user.email),users:users.filter(u=>u.email?.toLowerCase()!==session.user.email?.toLowerCase()).map(u=>({id:u.id,username:u.username,name:u.name,email:u.email,role:u.role,hasAdminAccess:getUserAdminStatus(u),isConfiguredAdmin:isConfiguredAdminEmail(u.email),gymAccessCount:u.gymAccesses.length,lastActiveAt:u.lastLoginAt?.toISOString()||null,eventCount:0}))})}
