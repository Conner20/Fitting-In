"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldPlus, ShieldX, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

type User={id:string;email:string|null;role:string|null;hasAdminAccess:boolean;isConfiguredAdmin:boolean;lastActiveAt:string|null;gymAccessCount:number;gyms:{id:string;name:string}[];dayPassClicks:number;confirmedDayPasses:number;membershipClicks:number;confirmedMemberships:number};
type SortKey="role"|"dayPassClicks"|"confirmedDayPasses"|"membershipClicks"|"confirmedMemberships"|"lastActiveAt";
export default function AdminUserManager(){
 const[users,setUsers]=useState<User[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[canManage,setCanManage]=useState(false),[selected,setSelected]=useState<string[]>([]),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[page,setPage]=useState(1),[sort,setSort]=useState<{key:SortKey;direction:"asc"|"desc"}>({key:"role",direction:"asc"});
 const load=async()=>{setLoading(true);const response=await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`,{cache:"no-store"});const data=await response.json().catch(()=>({}));if(response.ok){setUsers(data.users??[]);setCanManage(Boolean(data.canManageUsers));setPage(1)}else setMessage(data.error??"Unable to load users.");setLoading(false)};
 useEffect(()=>{const id=setTimeout(()=>void load(),200);return()=>clearTimeout(id)},[query]);
 const changeAdminAccess=async()=>{if(!selected.length||!password)return setMessage("Enter your password and select at least one account.");const selectedAreAdmins=selected.every(id=>users.find(user=>user.id===id)?.hasAdminAccess),isAdmin=!selectedAreAdmins;const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userIds:selected,password,isAdmin})});const data=await response.json().catch(()=>({}));if(!response.ok){setMessage(data.error??"Unable to change admin access.");return}const count=Number(data.count)||selected.length;setSelected([]);setPassword("");setMessage(`${count} account${count===1?"":"s"} ${isAdmin?"granted admin access":"demoted from admin"}.`);await load()};
 const remove=async()=>{if(!selected.length||!password)return setMessage("Enter your password and select at least one account.");if(!confirm(`Delete ${selected.length} selected account${selected.length===1?"":"s"}? This cannot be undone.`))return;for(const targetUserId of selected){const response=await fetch("/api/user/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({password,targetUserId})});const data=await response.json().catch(()=>({}));if(!response.ok){setMessage(data.message??"Unable to delete account.");return}}setSelected([]);setPassword("");setMessage("Selected accounts deleted.");await load()};
 const roleRank=(role:string|null)=>role==="GYM"?0:role==="TRAINEE"?1:2,sortedUsers=[...users].sort((a,b)=>{const raw=sort.key==="role"?roleRank(a.role)-roleRank(b.role):sort.key==="lastActiveAt"?(a.lastActiveAt?Date.parse(a.lastActiveAt):0)-(b.lastActiveAt?Date.parse(b.lastActiveAt):0):a[sort.key]-b[sort.key];return (sort.direction==="asc"?raw:-raw)||(a.email||"").localeCompare(b.email||"")}),pageSize=10,totalPages=Math.max(1,Math.ceil(sortedUsers.length/pageSize)),visibleUsers=sortedUsers.slice((page-1)*pageSize,page*pageSize); const selectedAreAdmins=selected.length>0&&selected.every(id=>users.find(user=>user.id===id)?.hasAdminAccess);
 const sortBy=(key:SortKey)=>{setPage(1);setSort(current=>current.key===key?{key,direction:current.direction==="asc"?"desc":"asc"}:{key,direction:key==="role"?"asc":"desc"})},sortHeader=(key:SortKey,label:string)=>
<button type="button" onClick={()=>sortBy(key)} className="inline-flex items-center gap-1 font-bold hover:text-[#22c55e]">{label}<span aria-hidden="true">{sort.key===key?(sort.direction==="asc"?"↑":"↓"):"↕"}</span>
</button>;
 return <div className="space-y-5">
<div className="flex flex-wrap gap-3">
<Input value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="Search by email" className="max-w-md"/>
<button onClick={()=>void load()} className="rounded-xl border px-4 py-2 transition hover:border-[#22c55e] hover:text-[#22c55e]">
<RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>
</button>
</div>{message&&<p className="rounded-xl border border-black/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5">{message}</p>}<div className="overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5 lg:overflow-visible">
<table className="w-full min-w-[1080px] text-sm">
<thead>
<tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
<th className="p-4">Select</th>
<th>Account email</th>
<th>{sortHeader("role","Role")}</th>
<th>{sortHeader("dayPassClicks","Clicks / confirms")}</th>
<th>{sortHeader("membershipClicks","Membership clicks / confirms")}</th>
<th>{sortHeader("lastActiveAt","Last active")}</th>
</tr>
</thead>
<tbody>{visibleUsers.map(user=>
<tr key={user.id} className="border-t border-black/5 dark:border-white/10">
<td className="p-4">
<input type="checkbox" disabled={user.isConfiguredAdmin} checked={selected.includes(user.id)} onChange={()=>setSelected(current=>current.includes(user.id)?current.filter(id=>id!==user.id):(current.some(id=>users.find(item=>item.id===id)?.hasAdminAccess!==user.hasAdminAccess)?[user.id]:[...current,user.id]))} className="h-4 w-4 accent-[#22c55e]"/>
</td>
<td>
<b>{user.email||"Email unavailable"}</b>
</td>
<td>{user.role==="GYM"?<span className="group/gym-role relative inline-flex">{user.gyms[0]?<Link href={`/admin/gyms/${user.gyms[0].id}`} className="border-b border-dotted border-zinc-400 font-semibold transition hover:text-[#22c55e] focus:text-[#22c55e]">GYM</Link>:<span className="cursor-help border-b border-dotted border-zinc-400 font-semibold" tabIndex={0}>GYM</span>}<span className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#111411] px-3 py-2 text-xs font-semibold normal-case text-white opacity-0 shadow-2xl transition group-hover/gym-role:visible group-hover/gym-role:opacity-100 group-focus-within/gym-role:visible group-focus-within/gym-role:opacity-100">{user.gyms.length?user.gyms.map(gym=>gym.name).join(", "):"No listing assigned"}</span></span>:user.role||"—"}</td>
<td><span className="font-semibold">{user.dayPassClicks}</span><span className="mx-1.5 text-zinc-400">/</span><span>{user.confirmedDayPasses}</span></td>
<td><span className="font-semibold">{user.membershipClicks}</span><span className="mx-1.5 text-zinc-400">/</span><span>{user.confirmedMemberships}</span></td>
<td>{user.lastActiveAt?new Date(user.lastActiveAt).toLocaleString():"No activity"}</td>
</tr>)}</tbody>
</table>{!loading&&!users.length&&<p className="p-8 text-center text-zinc-500">No accounts found.</p>}</div>{users.length>pageSize&&<div className="flex items-center justify-center gap-3">
<button type="button" disabled={page===1} onClick={()=>setPage(current=>Math.max(1,current-1))} className="rounded-full border border-black/15 px-4 py-2 text-sm font-bold transition hover:border-[#22c55e] hover:font-black hover:ring-1 hover:ring-[#22c55e] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15">Previous</button>
<span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
<button type="button" disabled={page===totalPages} onClick={()=>setPage(current=>Math.min(totalPages,current+1))} className="rounded-full border border-black/15 px-4 py-2 text-sm font-bold transition hover:border-[#22c55e] hover:font-black hover:ring-1 hover:ring-[#22c55e] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15">Next</button>
</div>}{canManage&&<div className="flex flex-wrap items-end gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
<label className="min-w-[260px] flex-1 text-sm font-medium">Admin password<PasswordInput value={password} onChange={event=>setPassword(event.target.value)} className="mt-1"/>
</label>
<button onClick={()=>void remove()} disabled={!selected.length} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40">
<Trash2 className="h-4 w-4"/>Delete selected</button>
<button onClick={()=>void changeAdminAccess()} disabled={!selected.length} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${selectedAreAdmins?"border-amber-400 bg-amber-400 text-black hover:bg-black hover:text-amber-400":"border-[#22c55e] bg-[#22c55e] text-black hover:bg-black hover:text-[#22c55e]"}`}>{selectedAreAdmins?<>
<ShieldX className="h-4 w-4"/>Demote admin</>:<>
<ShieldPlus className="h-4 w-4"/>Make admin</>}</button>
</div>}</div>
}
