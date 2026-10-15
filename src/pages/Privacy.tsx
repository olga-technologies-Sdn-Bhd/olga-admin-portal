import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPrivacyRequests, setPrivacyRequestStatus } from '../api/admin';
import type { PrivacyRequest, PrivacyStatus } from '../api/types';
import { Pagination, usePagination } from '../components/Pagination';
import { useConfirm, useToast } from '../components/feedback';
import { Badge, PageHeader, QueryState, errorMessage, fmtDate, useNow } from '../components/ui';

const closed = (p: PrivacyRequest) => p.status === 'COMPLETED' || p.status === 'REJECTED';

export function Privacy() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow();
  const requests = useQuery({ queryKey: ['privacy'], queryFn: getPrivacyRequests });
  const update = useMutation({
    mutationFn: ({ p, s }: { p: PrivacyRequest; s: PrivacyStatus }) => setPrivacyRequestStatus(p.privacyRequestId, s),
    onSuccess: (_, { s }) => {
      toast('success', `Request marked ${s.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['privacy'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => toast('error', `Update failed: ${errorMessage(e)}`),
  });
  // Soonest due first; requests without a due date last.
  const rows = [...(requests.data ?? [])].sort((a, b) =>
    (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
  const { pageRows, ...pager } = usePagination(rows);

  const finish = async (p: PrivacyRequest, s: 'COMPLETED' | 'REJECTED') => {
    const ok = await confirm({
      title: s === 'COMPLETED' ? 'Mark request complete?' : 'Reject request?',
      message: s === 'COMPLETED'
        ? `Confirm the ${p.requestType.toLowerCase()} for member ${p.memberId} has been fully fulfilled.`
        : `The ${p.requestType.toLowerCase()} request from ${p.memberId} will be closed without fulfilment.`,
      confirmLabel: s === 'COMPLETED' ? 'Mark complete' : 'Reject', danger: s === 'REJECTED',
    });
    if (ok) update.mutate({ p, s });
  };

  return (
    <>
      <PageHeader title="Privacy requests" subtitle="Member data access, export and deletion requests" />
      <section className="card">
        <QueryState isLoading={requests.isLoading} error={requests.error} empty={requests.isSuccess && rows.length === 0}
          emptyText="No privacy requests." emptyIcon="lock" />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Request</th><th>Member</th><th>Type</th><th>Received</th><th>Due</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {pageRows.map((p) => {
                  const overdue = !closed(p) && p.dueAt !== null && Date.parse(p.dueAt) < now;
                  return (
                    <tr key={p.privacyRequestId}>
                      <td><code>{p.privacyRequestId.slice(0, 12)}</code></td>
                      <td>{p.memberId}</td>
                      <td>{p.requestType.replace(/_/g, ' ').toLowerCase()}</td>
                      <td>{fmtDate(p.createdAt)}</td>
                      <td className={overdue ? 'error' : undefined}>{fmtDate(p.dueAt)}{overdue && <span className="sub">Overdue</span>}</td>
                      <td><Badge value={p.status} /></td>
                      <td>
                        <div className="row-actions">
                          {p.status === 'OPEN' && <button className="btn btn-sm" disabled={update.isPending} onClick={() => update.mutate({ p, s: 'VERIFIED' })}>Verify identity</button>}
                          {p.status === 'VERIFIED' && <button className="btn btn-sm" disabled={update.isPending} onClick={() => update.mutate({ p, s: 'PROCESSING' })}>Start processing</button>}
                          {p.status === 'PROCESSING' && <button className="btn btn-sm btn-primary" disabled={update.isPending} onClick={() => void finish(p, 'COMPLETED')}>Mark complete</button>}
                          {!closed(p) && <button className="btn btn-sm btn-danger" disabled={update.isPending} onClick={() => void finish(p, 'REJECTED')}>Reject</button>}
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
