import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReports, setMemberStatus, setReportStatus } from '../api/admin';
import type { ModerationReport, ReportStatus } from '../api/types';
import { Pagination, usePagination } from '../components/Pagination';
import { useConfirm, useToast } from '../components/feedback';
import { Badge, PageHeader, QueryState, errorMessage, fmtDate } from '../components/ui';

export function Moderation() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const reports = useQuery({ queryKey: ['reports'], queryFn: getReports });
  const refresh = () => ['reports', 'stats', 'members'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const update = useMutation({
    mutationFn: async ({ r, s, suspend }: { r: ModerationReport; s: ReportStatus; suspend?: boolean }) => {
      if (suspend && r.subjectMemberId) await setMemberStatus(r.subjectMemberId, 'HIDDEN');
      return setReportStatus(r.reportId, s);
    },
    onSuccess: (_, { r, s, suspend }) => { toast('success', suspend ? `${name(r)} suspended and report actioned` : `Report marked ${s.toLowerCase()}`); refresh(); },
    onError: (e) => toast('error', `Update failed: ${errorMessage(e)}`),
  });
  const rows = (reports.data ?? []).filter((r) => filter === 'all' || r.status === 'OPEN' || r.status === 'TRIAGED');
  const { pageRows, ...pager } = usePagination(rows);

  const suspend = async (r: ModerationReport) => {
    const ok = await confirm({ title: `Suspend ${name(r)}?`, message: 'The member is hidden and removed from live events, and this report is marked actioned.', confirmLabel: 'Suspend member', danger: true });
    if (ok) update.mutate({ r, s: 'ACTIONED', suspend: true });
  };
  const close = async (r: ModerationReport) => {
    const ok = await confirm({ title: 'Close without action?', message: `The report on ${name(r)} will be closed and no action taken.`, confirmLabel: 'Close report' });
    if (ok) update.mutate({ r, s: 'CLOSED' });
  };

  return (
    <>
      <PageHeader title="Moderation" subtitle="Reports and flagged content" />
      <section className="card">
        <div className="toolbar">
          <div className="tabs" role="group" aria-label="Filter reports">
            <button aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>Needs attention</button>
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All reports</button>
          </div>
        </div>
        <QueryState isLoading={reports.isLoading} error={reports.error} empty={reports.isSuccess && rows.length === 0}
          emptyText="All clear. No reports need attention." emptyIcon="shield" />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Source</th><th>Content</th><th>Priority</th><th>Reported</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {pageRows.map((r) => {
                  const open = r.status === 'OPEN' || r.status === 'TRIAGED';
                  return (
                    <tr key={r.reportId}>
                      <td><strong>{name(r)}</strong><span className="sub">{r.subjectMemberId ?? '—'}</span></td>
                      <td>{r.sourceType.replace(/_/g, ' ').toLowerCase()}</td>
                      <td>{r.resourceType?.toLowerCase() ?? '—'}<span className="sub">{r.resourceId}</span></td>
                      <td><Badge value={r.priority} /></td>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td><Badge value={r.status} /></td>
                      <td>
                        <div className="row-actions">
                          {r.status === 'OPEN' && <button className="btn btn-sm" disabled={update.isPending} onClick={() => update.mutate({ r, s: 'TRIAGED' })}>Triage</button>}
                          {open && r.subjectMemberId && <button className="btn btn-sm btn-danger" disabled={update.isPending} onClick={() => void suspend(r)}>Suspend member</button>}
                          {open && <button className="btn btn-sm" disabled={update.isPending} onClick={() => void close(r)}>Close</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} />
      </section>
    </>
  );
}

const name = (r: ModerationReport) => r.subjectDisplayName || r.subjectMemberId || 'Unknown member';
