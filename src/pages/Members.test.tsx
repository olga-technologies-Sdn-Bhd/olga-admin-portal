import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConfirmProvider, ToastProvider } from '../components/feedback';
import { setConfigForTests } from '../config';
import { Members } from './Members';

function renderMembers() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider><ConfirmProvider><Members /></ConfirmProvider></ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Members', () => {
  beforeEach(() => setConfigForTests({ useMocks: true }));

  it('lists and filters members', async () => {
    renderMembers();
    expect(await screen.findByText('Aisha Khan')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search members'), 'ben');
    expect(screen.getByText('Ben Carter')).toBeInTheDocument();
    expect(screen.queryByText('Aisha Khan')).not.toBeInTheDocument();
  });

  it('suspends a member only after confirmation', async () => {
    renderMembers();
    const row = (await screen.findByText('Aisha Khan')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Suspend' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Suspend Aisha Khan?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));

    expect(await screen.findByText('Aisha Khan suspended')).toBeInTheDocument();
    expect(await within(row).findByRole('button', { name: 'Reinstate' })).toBeInTheDocument();
  });
});
