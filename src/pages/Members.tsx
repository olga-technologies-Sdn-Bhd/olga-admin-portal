import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMembers, setMemberStatus } from '../api/admin';
import { PROFILE_STATUSES, type AdminMember, type ProfileStatus } from '../api/types';
import { Pagination, usePagination } from '../components/Pagination';
import { useConfirm, useToast } from '../components/feedback';
import { Badge, FilterSummary, PageHeader, QueryState, SortableHeader, errorMessage, fmtDate } from '../components/ui';

const verb: Record<ProfileStatus, string> = { ACTIVE: 'reinstated', HIDDEN: 'suspended', DRAFT: 'moved to draft', PENDING_REVIEW: 'sent for review' };

export function Members() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: 'displayName' | 'roleCategory' | 'completenessScore' | 'profileStatus' | 'createdAt'; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const members = useQuery({ queryKey: ['members'], queryFn: getMembers });
  const update = useMutation({
    mutationFn: ({ m, s }: { m: AdminMember; s: ProfileStatus }) => setMemberStatus(m.memberId, s, m.etag),
    onSuccess: (_, { m, s }) => {
      toast('success', `${m.displayName} ${verb[s]}`);
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => toast('error', `Update failed: ${errorMessage(e)}`),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(members.data ?? [])].filter((m) =>
      (!status || m.profileStatus === status) &&
      (!q || m.displayName.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) || (m.headline ?? '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const left = sort.key === 'createdAt' ? Date.parse(a.createdAt) : (a[sort.key] ?? '');
        const right = sort.key === 'createdAt' ? Date.parse(b.createdAt) : (b[sort.key] ?? '');
        const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
        return sort.direction === 'asc' ? result : -result;
      });
  }, [members.data, search, status, sort]);
  const { pageRows, ...pager } = usePagination(rows);
  const changeSort = (key: typeof sort.key) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));

  const suspend = async (m: AdminMember) => {
    const ok = await confirm({
      title: `Suspend ${m.displayName}?`,
      message: 'Their profile is hidden from other members and they are taken out of any live event until reinstated.',
      confirmLabel: 'Suspend', danger: true,
    });
    if (ok) update.mutate({ m, s: 'HIDDEN' });
  };

  return (
    <>
      <PageHeader title="People" subtitle={members.data ? `${members.data.length} members` : undefined} />
      <section className="card">
        <div className="toolbar">
          <input type="search" aria-label="Search members" placeholder="Search name, ID or headline" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {PROFILE_STATUSES.map((s) => <option key={s} value={s}>{s === 'HIDDEN' ? 'Suspended' : s.replace('_', ' ').toLowerCase()}</option>)}
          </select>
        </div>
        <FilterSummary labels={[search.trim() && `Search: ${search.trim()}`, status && `Status: ${status.replace(/_/g, ' ').toLowerCase()}`].filter(Boolean) as string[]}
          onClear={() => { setSearch(''); setStatus(''); }} />
        <QueryState isLoading={members.isLoading} error={members.error} empty={members.isSuccess && rows.length === 0} emptyIcon="users" />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <SortableHeader label="Member" active={sort.key === 'displayName'} direction={sort.direction} onSort={() => changeSort('displayName')} />
                <SortableHeader label="Role" active={sort.key === 'roleCategory'} direction={sort.direction} onSort={() => changeSort('roleCategory')} />
                <SortableHeader label="Profile" active={sort.key === 'completenessScore'} direction={sort.direction} onSort={() => changeSort('completenessScore')} />
                <SortableHeader label="Status" active={sort.key === 'profileStatus'} direction={sort.direction} onSort={() => changeSort('profileStatus')} />
                <SortableHeader label="Joined" active={sort.key === 'createdAt'} direction={sort.direction} onSort={() => changeSort('createdAt')} />
                <th><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {pageRows.map((m) => {
                  const pending = update.isPending && update.variables?.m.memberId === m.memberId;
                  return <tr key={m.memberId}>
                    <td><Link className="record-link" to={`/members/${encodeURIComponent(m.memberId)}`}><strong>{m.displayName || '(no name yet)'}</strong></Link><span className="sub">{m.memberId}</span></td>
                    <td>{m.roleCategory ?? '—'}<span className="sub">{m.headline}</span></td>
                    <td><span className="progress"><span style={{ width: `${m.completenessScore}%` }} /></span>{Math.round(m.completenessScore)}%</td>
                    <td><Badge value={m.profileStatus} /></td>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        {m.profileStatus === 'PENDING_REVIEW' && <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => update.mutate({ m, s: 'ACTIVE' })}>{pending ? 'Approving…' : 'Approve'}</button>}
                        {m.profileStatus === 'HIDDEN'
                          ? <button className="btn btn-sm" disabled={pending} onClick={() => update.mutate({ m, s: 'ACTIVE' })}>{pending ? 'Reinstating…' : 'Reinstate'}</button>
                          : <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => void suspend(m)}>{pending ? 'Suspending…' : 'Suspend'}</button>}
                      </div>
                    </td>
                  </tr>;
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
