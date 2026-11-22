import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applySciApproval, createSciApproval, decideSciApproval, getSciApprovals,
  getSciConfiguration, getSciOverview,
} from '../api/admin';
import type { SciChangeApproval, SciChangeType } from '../api/types';
import { useToast } from '../components/feedback';
import { Badge, PageHeader, QueryState, StatCard, errorMessage, fmtDate } from '../components/ui';

const resourceDefaults: Record<SciChangeType, [string, string, string]> = {
  CORE_RULE: ['SCI_PRODUCT_CONFIG', 'SCI_PRODUCT_V1', '{\n  "layer_sizes": [5, 15, 50, 150, 1500]\n}'],
  OPERATIONAL_SETTING: ['SCI_PRODUCT_CONFIG', 'SCI_PRODUCT_V1', '{\n  "reach_out_default_threshold": 70\n}'],
  SCORING_CALIBRATION: ['SCI_SCORING_CONFIG', 'SCI_GLOBAL_V2', '{\n  "cosine_floor": 0.2,\n  "cosine_span": 0.6\n}'],
  FULL_RESCORE: ['SCI_SCORING_SCOPE', 'GLOBAL', '{}'],
  OUTCOME_CORRECTION: ['RELATIONSHIP_OUTCOME', '', '{\n  "corrected_status": "WITHDRAWN",\n  "reason": "Support-verified correction"\n}'],
};

export function SciGovernance() {
  const qc=useQueryClient(); const toast=useToast();
  const overview=useQuery({queryKey:['sci-overview'],queryFn:getSciOverview});
  const configuration=useQuery({queryKey:['sci-configuration'],queryFn:getSciConfiguration});
  const approvals=useQuery({queryKey:['sci-approvals'],queryFn:getSciApprovals});
  const [changeType,setChangeType]=useState<SciChangeType>('OPERATIONAL_SETTING');
  const [resourceType,setResourceType]=useState(resourceDefaults.OPERATIONAL_SETTING[0]);
  const [resourceId,setResourceId]=useState(resourceDefaults.OPERATIONAL_SETTING[1]);
  const [payload,setPayload]=useState(resourceDefaults.OPERATIONAL_SETTING[2]);
  const refresh=()=>{void qc.invalidateQueries({queryKey:['sci-overview']});void qc.invalidateQueries({queryKey:['sci-configuration']});void qc.invalidateQueries({queryKey:['sci-approvals']});};
  const create=useMutation({mutationFn:createSciApproval,onSuccess:()=>{toast('success','SCI change submitted');refresh();},onError:(e)=>toast('error',errorMessage(e))});
  const decide=useMutation({mutationFn:({value,approve}:{value:SciChangeApproval;approve:boolean})=>decideSciApproval(value,approve),onSuccess:refresh,onError:(e)=>toast('error',errorMessage(e))});
  const apply=useMutation({mutationFn:applySciApproval,onSuccess:()=>{toast('success','Approved SCI change applied');refresh();},onError:(e)=>toast('error',errorMessage(e))});
  const selectType=(value:SciChangeType)=>{const defaults=resourceDefaults[value];setChangeType(value);setResourceType(defaults[0]);setResourceId(defaults[1]);setPayload(defaults[2]);};
  const submit=(event:FormEvent)=>{event.preventDefault();try{create.mutate({changeType,resourceType,resourceId,payload:JSON.parse(payload) as Record<string,unknown>});}catch{toast('error','Payload must be valid JSON.');}};
  const config=configuration.data;

  return <>
    <PageHeader title="SCI governance" subtitle="Approved rules, scoring health, controlled changes and full rescores" />
    <QueryState isLoading={overview.isLoading||configuration.isLoading} error={overview.error??configuration.error} />
    {overview.data&&<div className="stats-grid">
      <StatCard label="SCI members" value={overview.data.memberStateCount} icon="users" />
      <StatCard label="Ready" value={overview.data.readyCount} icon="check" tone="ok" />
      <StatCard label="Recalculating" value={overview.data.recalculatingCount} icon="activity" tone="info" />
      <StatCard label="Failed jobs" value={overview.data.failedScoringJobCount} icon="flag" tone={overview.data.failedScoringJobCount?'bad':'neutral'} />
    </div>}
    {config&&<section className="card pad"><h2>Active configuration</h2>
      <p><code>{config.scoringConfigId}</code> · <Badge value={config.status} /> · scorer {config.scorerVersion}</p>
      <p className="muted">Weights {config.semanticWeight}/{config.complementarityWeight}/{config.recencyWeight} · bands &lt;{config.waitlistThreshold}, {config.waitlistThreshold}–{config.networkThreshold-1}, {config.networkThreshold}+ · estimated cap {config.estimatedScoreCap}</p>
      <p className="muted">Goal {config.initialGoalValue.toLocaleString()} · inactivity {config.relationshipInactivityDays} days · outcomes {config.outcomeValidityDays} days · reach-out threshold {config.reachOutDefaultThreshold}</p>
    </section>}
    <section className="card pad"><h2>Propose controlled change</h2>
      <form onSubmit={submit} className="form-grid">
        <label>Change type<select value={changeType} onChange={(e)=>selectType(e.target.value as SciChangeType)}><option>CORE_RULE</option><option>OPERATIONAL_SETTING</option><option>SCORING_CALIBRATION</option><option>FULL_RESCORE</option><option>OUTCOME_CORRECTION</option></select></label>
        <label>Resource type<input value={resourceType} onChange={(e)=>setResourceType(e.target.value)} /></label>
        <label>Resource ID<input value={resourceId} onChange={(e)=>setResourceId(e.target.value)} /></label>
        <label className="span-2">JSON payload<textarea rows={6} value={payload} onChange={(e)=>setPayload(e.target.value)} /></label>
        <div><button className="btn btn-primary" disabled={create.isPending}>Submit for approval</button></div>
      </form>
    </section>
    <section className="card"><h2 className="pad">Change approvals</h2>
      <QueryState isLoading={approvals.isLoading} error={approvals.error} empty={approvals.isSuccess&&approvals.data.items.length===0} emptyText="No SCI changes." />
      {!!approvals.data?.items.length&&<div className="table-wrap"><table><thead><tr><th>Change</th><th>Resource</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {approvals.data.items.map((value)=><tr key={value.changeApprovalId}><td>{value.changeType.replaceAll('_',' ').toLowerCase()}</td><td><code>{value.resourceId}</code></td><td>{fmtDate(value.requestedAt)}<span className="sub">{value.requestedBy}</span></td><td><Badge value={value.status}/></td><td><div className="row-actions">
          {value.allowedActions.includes('APPROVE')&&<button className="btn btn-sm" onClick={()=>decide.mutate({value,approve:true})}>Approve</button>}
          {value.allowedActions.includes('REJECT')&&<button className="btn btn-sm btn-danger" onClick={()=>decide.mutate({value,approve:false})}>Reject</button>}
          {value.allowedActions.includes('APPLY')&&<button className="btn btn-sm btn-primary" onClick={()=>apply.mutate(value)}>Apply</button>}
        </div></td></tr>)}
      </tbody></table></div>}
    </section>
  </>;
}
