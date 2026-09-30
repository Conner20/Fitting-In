import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminBehaviorDashboard from "@/components/AdminBehaviorDashboard";
import AdminHeader from "@/components/AdminHeader";
import AdminMetricCard from "@/components/AdminMetricCard";
import AdminUserManager from "@/components/AdminUserManager";
import AdminGymVerificationLog from "@/components/AdminGymVerificationLog";
import AdminMetricsActions from "@/components/AdminMetricsActions";
import AdminFinancialMetrics from "@/components/AdminFinancialMetrics";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { db } from "@/prisma/client";
import { membershipChargeForPeriod, membershipContractEnd, membershipTermsFromMetadata } from "@/lib/membership-attribution";
import { cleanMembershipOptions, recurringMonthlyPrice } from "@/lib/memberships";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) redirect("/");
  const requestedRange = (await searchParams).range ?? "all";
  const range = ["week", "month", "year", "all"].includes(requestedRange) ? requestedRange : "all";
  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : range === "year" ? 365 : 0;
  const since = rangeDays ? new Date(Date.now() - rangeDays * 86_400_000) : null;
  const createdAt = since ? { createdAt: { gte: since } } : {};
  const [users, gymUsers, visitEvents, dayPassClicks, dayPassConfirmationEvents, membershipClicks, membershipConfirmationEvents, dayPassSignups, membershipSignups, attributionClicks, financialEvents, listedGyms, membershipLifecycleEvents, unclaimedClaimEvents] = await Promise.all([
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, ...createdAt } }),
    db.user.count({ where: { emailVerified: { not: null }, deletedAt: null, role: "GYM", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: "VISIT", ...createdAt }, select: { userId: true, visitorId: true, visitId: true } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED", "DAY_PASS_GYM_DECLINED"] } }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_CLICKED", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED", "MEMBERSHIP_GYM_DECLINED"] } }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, metadata: true, createdAt: true } }),
    db.landingEvent.count({ where: { eventType: "DAY_PASS_SIGNUP", ...createdAt } }),
    db.landingEvent.count({ where: { eventType: "MEMBERSHIP_SIGNUP", ...createdAt } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLICKED", "MEMBERSHIP_CLICKED"] } }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50_000 }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_GYM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED", "MEMBERSHIP_CYCLE_GYM_CONFIRMED"] }, ...createdAt }, select: { eventType: true, metadata: true, createdAt: true, gym: { select: { id: true, name: true } }, user: { select: { email: true } } }, orderBy: { createdAt: "asc" }, take: 50_000 }),
    db.gym.count({ where: { isPublished: true } }),
    db.landingEvent.findMany({ where: { eventType: { in: ["MEMBERSHIP_CLICKED", "MEMBERSHIP_GYM_CONFIRMED", "MEMBERSHIP_GYM_ENDED"] } }, select: { id: true, eventType: true, gymId: true, metadata: true, createdAt: true, gym: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 50_000 }),
    db.landingEvent.findMany({ where: { eventType: { in: ["DAY_PASS_CLICKED", "DAY_PASS_CLAIM_CONFIRMED", "DAY_PASS_GYM_CONFIRMED", "DAY_PASS_GYM_DECLINED", "MEMBERSHIP_CLICKED", "MEMBERSHIP_CLAIM_CONFIRMED", "MEMBERSHIP_GYM_CONFIRMED", "MEMBERSHIP_GYM_DECLINED"] }, gym: { access: { none: {} } } }, select: { id: true, eventType: true, userId: true, visitorId: true, gymId: true, visitId: true, metadata: true, createdAt: true, user: { select: { email: true } }, gym: { select: { name: true, membershipOptions: true } } }, orderBy: { createdAt: "asc" }, take: 50_000 }),
  ]);
  const actor = (event: { userId: string | null; visitorId: string }) => event.userId ? `user:${event.userId}` : `visitor:${event.visitorId}`;
  const confirmationKey = (event: typeof dayPassConfirmationEvents[number] | typeof membershipConfirmationEvents[number], clickType: "DAY_PASS_CLICKED" | "MEMBERSHIP_CLICKED") => { const metadata=event.metadata as Record<string,unknown>|null;if(event.eventType.endsWith("_GYM_CONFIRMED")&&typeof metadata?.claimClickId==="string")return metadata.claimClickId;return attributionClicks.find(click=>click.eventType===clickType&&click.gymId===event.gymId&&actor(click)===actor(event)&&click.createdAt<=event.createdAt)?.id||event.id };
  const scopedDayPassClickIds=new Set(attributionClicks.filter(click=>click.eventType==="DAY_PASS_CLICKED"&&(!since||click.createdAt>=since)).map(click=>click.id)),scopedMembershipClickIds=new Set(attributionClicks.filter(click=>click.eventType==="MEMBERSHIP_CLICKED"&&(!since||click.createdAt>=since)).map(click=>click.id));
  const gymConfirmedDayPassKeys = new Set(dayPassConfirmationEvents.filter(event => event.eventType === "DAY_PASS_GYM_CONFIRMED").map(event=>confirmationKey(event,"DAY_PASS_CLICKED")).filter(key=>scopedDayPassClickIds.has(key))),gymDeclinedDayPassKeys=new Set(dayPassConfirmationEvents.filter(event=>event.eventType==="DAY_PASS_GYM_DECLINED").map(event=>confirmationKey(event,"DAY_PASS_CLICKED"))),userReportedDayPassKeys=new Set(dayPassConfirmationEvents.filter(event=>event.eventType==="DAY_PASS_CLAIM_CONFIRMED").map(event=>confirmationKey(event,"DAY_PASS_CLICKED")).filter(key=>scopedDayPassClickIds.has(key)&&!gymConfirmedDayPassKeys.has(key)&&!gymDeclinedDayPassKeys.has(key)));
  const gymConfirmedMembershipKeys = new Set(membershipConfirmationEvents.filter(event => event.eventType === "MEMBERSHIP_GYM_CONFIRMED").map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED")).filter(key=>scopedMembershipClickIds.has(key))),gymDeclinedMembershipKeys=new Set(membershipConfirmationEvents.filter(event=>event.eventType==="MEMBERSHIP_GYM_DECLINED").map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED"))),userReportedMembershipKeys=new Set(membershipConfirmationEvents.filter(event=>event.eventType==="MEMBERSHIP_CLAIM_CONFIRMED").map(event=>confirmationKey(event,"MEMBERSHIP_CLICKED")).filter(key=>scopedMembershipClickIds.has(key)&&!gymConfirmedMembershipKeys.has(key)&&!gymDeclinedMembershipKeys.has(key)));
  const confirmedDayPasses = gymConfirmedDayPassKeys.size,confirmedDayPassesByUser=userReportedDayPassKeys.size;
  const confirmedMemberships = gymConfirmedMembershipKeys.size,confirmedMembershipsByUser=userReportedMembershipKeys.size;
  const visitors = new Set(visitEvents.map(actor)).size;
  const visits = new Set(visitEvents.map(event => event.visitId)).size;
  type RevenueRow={id?:string;name:string;total:number;dayPass:number;membership:number;payments:number;customers:number;mrr:number};
  type OfferRow={gymId:string;gym:string;type:"Day pass"|"Membership";offer:string;revenue:number;payments:number};
  const gymRevenue=new Map<string,RevenueRow>(),userRevenue=new Map<string,RevenueRow>(),offerRevenue=new Map<string,OfferRow>(),gymCustomers=new Map<string,Set<string>>();
  const financialTimeline:{date:string;gymId:string;gymName:string;email:string;type:"Day pass"|"Membership";amountCents:number}[]=[];
  let totalAttributedCents=0,dayPassAttributedCents=0,membershipAttributedCents=0,paidCharges=0;
  const addRevenue=(map:Map<string,RevenueRow>,key:string,amountCents:number,type:"Day pass"|"Membership",id?:string)=>{const row=map.get(key)??{id,name:key,total:0,dayPass:0,membership:0,payments:0,customers:0,mrr:0};row.total+=amountCents;row[type==="Day pass"?"dayPass":"membership"]+=amountCents;row.payments+=1;map.set(key,row)};
  for(const event of financialEvents){const metadata=event.metadata as Record<string,unknown>|null,amount=typeof metadata?.attributedAmount==="number"&&Number.isFinite(metadata.attributedAmount)?metadata.attributedAmount:0,amountCents=Math.max(0,Math.round(amount*100));if(!amountCents)continue;const type=event.eventType==="DAY_PASS_GYM_CONFIRMED"?"Day pass" as const:"Membership" as const,gym=event.gym?.name??"Deleted gym",gymId=event.gym?.id??"deleted",email=typeof metadata?.customerEmail==="string"&&metadata.customerEmail?metadata.customerEmail.toLowerCase():event.user?.email?.toLowerCase()??"Unknown user",offer=typeof metadata?.offerName==="string"&&metadata.offerName?metadata.offerName:type;financialTimeline.push({date:event.createdAt.toISOString().slice(0,10),gymId,gymName:gym,email,type,amountCents});totalAttributedCents+=amountCents;if(type==="Day pass")dayPassAttributedCents+=amountCents;else membershipAttributedCents+=amountCents;paidCharges+=1;addRevenue(gymRevenue,gym,amountCents,type,gymId);addRevenue(userRevenue,email,amountCents,type);const customers=gymCustomers.get(gym)??new Set<string>();customers.add(email);gymCustomers.set(gym,customers);const offerKey=`${gymId}:${type}:${offer}`,offerRow=offerRevenue.get(offerKey)??{gymId,gym,type,offer,revenue:0,payments:0};offerRow.revenue+=amountCents;offerRow.payments+=1;offerRevenue.set(offerKey,offerRow)}
  for(const [gym,row] of gymRevenue)row.customers=gymCustomers.get(gym)?.size??0;
  const membershipClicksById=new Map(membershipLifecycleEvents.filter(event=>event.eventType==="MEMBERSHIP_CLICKED").map(event=>[event.id,event])),endedMembershipDates=new Map(membershipLifecycleEvents.filter(event=>event.eventType==="MEMBERSHIP_GYM_ENDED").map(event=>{const metadata=event.metadata as Record<string,unknown>|null;return [typeof metadata?.claimClickId==="string"?metadata.claimClickId:"",event.createdAt] as const}).filter(([id])=>Boolean(id))),mrrMemberships:{gymId:string;gymName:string;start:string;end:string|null;mrrCents:number}[]=[];
  let totalMrrCents=0;
  for(const event of membershipLifecycleEvents.filter(event=>event.eventType==="MEMBERSHIP_GYM_CONFIRMED")){const metadata=event.metadata as Record<string,unknown>|null,clickId=typeof metadata?.claimClickId==="string"?metadata.claimClickId:"",startDate=typeof metadata?.membershipStartDate==="string"?metadata.membershipStartDate:"",click=membershipClicksById.get(clickId),terms=membershipTermsFromMetadata(click?.metadata);if(!click||!terms||!startDate)continue;const start=new Date(`${startDate}T00:00:00Z`),contractEnd=membershipContractEnd(terms,start),endedAt=endedMembershipDates.get(clickId),end=endedAt&&contractEnd?new Date(Math.min(endedAt.getTime(),contractEnd.getTime())):endedAt??contractEnd,mrrCents=Math.max(0,Math.round(recurringMonthlyPrice(terms)*100)),gym=event.gym?.name??click.gym?.name??"Deleted gym",gymId=event.gymId??click.gymId??"deleted";mrrMemberships.push({gymId,gymName:gym,start:event.createdAt.toISOString().slice(0,10),end:end?.toISOString().slice(0,10)??null,mrrCents});if(end&&end<=new Date())continue;totalMrrCents+=mrrCents;const row=gymRevenue.get(gym)??{id:gymId,name:gym,total:0,dayPass:0,membership:0,payments:0,customers:0,mrr:0};row.mrr+=mrrCents;gymRevenue.set(gym,row)}
  const today=new Date().toISOString().slice(0,10),earliest=[...financialTimeline.map(item=>item.date),...mrrMemberships.map(item=>item.start)].sort()[0]??today,trendStart=since?since.toISOString().slice(0,10):earliest;
  const buildFinancialTrend=(gymId?:string)=>{let total=0,dayPass=0,membership=0;const customers=new Set<string>(),points:{date:string;total:number;dayPass:number;membership:number;mrr:number;customers:number}[]=[];for(let cursor=new Date(`${trendStart}T00:00:00Z`),end=new Date(`${today}T00:00:00Z`);cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){const date=cursor.toISOString().slice(0,10);for(const item of financialTimeline)if(item.date===date&&(!gymId||item.gymId===gymId)){total+=item.amountCents;if(item.type==="Day pass")dayPass+=item.amountCents;else membership+=item.amountCents;customers.add(item.email)}const mrr=mrrMemberships.filter(item=>(!gymId||item.gymId===gymId)&&item.start<=date&&(!item.end||date<item.end)).reduce((sum,item)=>sum+item.mrrCents,0);points.push({date,total:total/100,dayPass:dayPass/100,membership:membership/100,mrr:mrr/100,customers:customers.size})}return points};
  const financialTrend=buildFinancialTrend(),financialGymOptions=new Map<string,string>();for(const item of [...financialTimeline,...mrrMemberships])financialGymOptions.set(item.gymId,item.gymName);const gymFinancialTrends=[...financialGymOptions].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>({id,name,points:buildFinancialTrend(id)}));
  const revenueRows=(map:Map<string,RevenueRow>)=>[...map.values()].map(row=>({...row,total:row.total/100,dayPass:row.dayPass/100,membership:row.membership/100,mrr:row.mrr/100}));
  const offerRows=[...offerRevenue.values()].map(row=>({...row,revenue:row.revenue/100}));
  type OpportunityRow={gymId:string;gym:string;purchases:number;dayPassPurchases:number;membershipPurchases:number;customers:number;estimated:number;dayPassEstimated:number;membershipEstimated:number};
  const opportunityByGym=new Map<string,OpportunityRow>(),opportunityCustomers=new Map<string,Set<string>>();
  const unclaimedActor=(event:typeof unclaimedClaimEvents[number])=>event.userId?`user:${event.userId}`:`visitor:${event.visitorId}`;
  const reportedOpportunityClicks=new Set<string>();
  for(const confirmation of unclaimedClaimEvents.filter(event=>["DAY_PASS_CLAIM_CONFIRMED","MEMBERSHIP_CLAIM_CONFIRMED"].includes(event.eventType)&&(!since||event.createdAt>=since))){const membership=confirmation.eventType==="MEMBERSHIP_CLAIM_CONFIRMED",clickType=membership?"MEMBERSHIP_CLICKED":"DAY_PASS_CLICKED",actorKey=unclaimedActor(confirmation),clicks=unclaimedClaimEvents.filter(event=>event.eventType===clickType&&event.gymId===confirmation.gymId&&unclaimedActor(event)===actorKey&&event.createdAt<=confirmation.createdAt),click=clicks.at(-1);if(!click||!click.gymId||reportedOpportunityClicks.has(click.id))continue;const prefix=membership?"MEMBERSHIP":"DAY_PASS",hasGymResponse=unclaimedClaimEvents.some(event=>event.visitId===`gym-confirm:${click.id}`&&[`${prefix}_GYM_CONFIRMED`,`${prefix}_GYM_DECLINED`].includes(event.eventType));if(hasGymResponse)continue;reportedOpportunityClicks.add(click.id);const metadata=click.metadata as Record<string,unknown>|null,optionId=typeof metadata?.optionId==="string"?metadata.optionId:"",terms=membershipTermsFromMetadata(metadata)??(membership?cleanMembershipOptions(click.gym?.membershipOptions).find(option=>option.id===optionId)??null:null),charge=membership&&terms?membershipChargeForPeriod(terms,click.createdAt.toISOString().slice(0,10),0):null,amountCents=Math.max(0,Math.round((membership?(charge?.total??(typeof metadata?.price==="number"?metadata.price:0)):(typeof metadata?.price==="number"?metadata.price:0))*100)),gym=click.gym?.name??"Deleted gym",row=opportunityByGym.get(click.gymId)??{gymId:click.gymId,gym,purchases:0,dayPassPurchases:0,membershipPurchases:0,customers:0,estimated:0,dayPassEstimated:0,membershipEstimated:0};row.purchases+=1;row[membership?"membershipPurchases":"dayPassPurchases"]+=1;row.estimated+=amountCents;row[membership?"membershipEstimated":"dayPassEstimated"]+=amountCents;opportunityByGym.set(click.gymId,row);const customers=opportunityCustomers.get(click.gymId)??new Set<string>();customers.add(actorKey);opportunityCustomers.set(click.gymId,customers)}
  for(const [gymId,row] of opportunityByGym)row.customers=opportunityCustomers.get(gymId)?.size??0;
  const opportunityRows=[...opportunityByGym.values()].map(row=>({...row,estimated:row.estimated/100,dayPassEstimated:row.dayPassEstimated/100,membershipEstimated:row.membershipEstimated/100}));
  const verificationLog = await db.gym.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, updatedAt: true,
      access: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true, assignedByEmail: true, user: { select: { email: true } } } },
    },
  });
  const verificationLogRows = verificationLog.map(gym => {
    const claim = gym.access[0] ?? null;
    const claimantEmail = claim?.user.email ?? null;
    return { id: gym.id, name: gym.name, isClaimed: Boolean(claim), claimedBy: claimantEmail ?? "—", claimedAt: claim?.createdAt.toISOString() ?? null, updatedAt: gym.updatedAt.toISOString() };
  });
  const cards: readonly (readonly [string, number | string, string?])[] = [
    ["Total Users / Gym Users", `${users.toLocaleString()} / ${gymUsers.toLocaleString()}`],
    ["Visitors / Visits", `${visitors.toLocaleString()} / ${visits.toLocaleString()}`],
    ["Day-pass Clicks / Confirmed / User Reported", `${dayPassClicks.toLocaleString()} / ${confirmedDayPasses.toLocaleString()} / ${confirmedDayPassesByUser.toLocaleString()}`],
    ["Membership Clicks / Confirmed / User Reported", `${membershipClicks.toLocaleString()} / ${confirmedMemberships.toLocaleString()} / ${confirmedMembershipsByUser.toLocaleString()}`],
    ["Day-pass Signups / Membership Signups", `${dayPassSignups.toLocaleString()} / ${membershipSignups.toLocaleString()}`],
  ];
  return <main className="min-h-screen bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white">
    <AdminHeader active="overview" />
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="admin-overview-period-row flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">Overview period</p><div className="admin-overview-period-options flex flex-wrap gap-2">{[["week","Past week","1W"],["month","Past month","1M"],["year","Past year","1Y"],["all","All time","ALL"]].map(([value,label,shortLabel])=><Link key={value} href={`/admin?range=${value}`} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${range===value?"border-[#22c55e] bg-[#22c55e] text-black":"border-black/10 hover:border-[#22c55e] dark:border-white/15"}`}><span className="md:hidden">{shortLabel}</span><span className="hidden md:inline">{label}</span></Link>)}</div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label,value,breakdown])=><AdminMetricCard key={label} label={label} value={value} breakdown={breakdown}/>)}</div>
      <section id="users" className="space-y-4"><div><h2 className="text-xl font-black">Users</h2></div><AdminUserManager /></section>
      <section id="gym-verification-log" className="space-y-4 border-t border-black/10 pt-8 dark:border-white/10">
        <h2 className="text-xl font-black">Gym claim log</h2>
        <AdminGymVerificationLog rows={verificationLogRows} />
      </section>
      <section id="behavior" className="admin-overview-behavior border-t border-black/10 pt-8 dark:border-white/10"><AdminBehaviorDashboard compact periodDays={rangeDays} /></section>
      <AdminFinancialMetrics total={totalAttributedCents/100} dayPass={dayPassAttributedCents/100} membership={membershipAttributedCents/100} totalMrr={totalMrrCents/100} payments={paidCharges} listedGyms={listedGyms} gymRows={revenueRows(gymRevenue)} userRows={revenueRows(userRevenue)} offerRows={offerRows} trend={financialTrend} gymTrends={gymFinancialTrends} opportunityRows={opportunityRows}/>
      <div className="flex justify-center border-t border-black/10 pt-8 dark:border-white/10"><AdminMetricsActions /></div>
    </section>
  </main>;
}
