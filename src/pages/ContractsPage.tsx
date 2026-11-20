import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { formatCurrency } from '../lib/rules';
import { StatusText } from '../components/StatusText';

export function ContractsPage() {
  const { userPrivate } = useAuth();
  const { contracts } = useMarketplaceData();

  if (!userPrivate) return null;

  const myContracts = contracts.filter(
    (c) => c.clientId === userPrivate.uid || c.freelancerId === userPrivate.uid
  );

  const totalEarned = contracts
    .filter((c) => c.freelancerId === userPrivate.uid)
    .reduce((sum, c) => sum + c.releasedAmount, 0);

  const totalEscrowHeld = contracts
    .filter((c) => c.clientId === userPrivate.uid && c.status === 'active')
    .reduce((sum, c) => sum + c.escrowBalance, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="pb-6 border-b border-neutral-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Контракты и эскроу
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Управляйте поэтапной оплатой в рублях, сдачей работ и безопасными выплатами.
          </p>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Баланс кошелька</p>
          <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrency(userPrivate.walletBalance)}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Зарезервировано в эскроу (заказчик)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrency(totalEscrowHeld)}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Заработано (исполнитель)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand-text dark:text-brand tabular-nums">
            {formatCurrency(totalEarned)}
          </p>
        </div>
      </div>

      {/* Contract List */}
      <div className="mt-8 space-y-4">
        {myContracts.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-10 text-center">
            <Lock className="w-8 h-8 text-neutral-400 mx-auto" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-white">
              Контрактов пока нет
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Контракт появляется после того, как заказчик выберет исполнителя по отклику.
            </p>
            <Link
              to="/jobs"
              className="mt-5 inline-flex px-4 py-2 rounded-lg bg-brand text-brand-ink text-xs font-semibold hover:bg-brand-hover"
            >
              Перейти к заказам
            </Link>
          </div>
        ) : (
          myContracts.map((contract) => {
            const approvedCount = contract.milestones.filter((m) => m.status === 'approved').length;
            const progressPct =
              contract.milestones.length > 0
                ? Math.round((approvedCount / contract.milestones.length) * 100)
                : 0;

            return (
              <div
                key={contract.id}
                className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-dark-border rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <StatusText status={contract.status} />
                    <span aria-hidden="true">·</span>
                    <span>
                      {contract.clientName} &rarr; {contract.freelancerName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{contract.escrowFunded ? 'Эскроу пополнен' : 'Ожидает пополнения эскроу'}</span>
                  </div>

                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
                    {contract.jobTitle}
                  </h2>

                  <div className="max-w-md space-y-1">
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                      <span>
                        Принято этапов: {approvedCount}/{contract.milestones.length}
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-dark-elevated overflow-hidden">
                      <div
                        className="h-full bg-brand transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrency(contract.totalAmount)}
                    </p>
                    <p className="font-mono text-xs text-brand-text dark:text-brand tabular-nums">
                      Выплачено: {formatCurrency(contract.releasedAmount)}
                    </p>
                  </div>
                  <Link
                    to={`/contracts/${contract.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-brand text-white dark:text-brand-ink text-xs font-semibold hover:bg-brand hover:text-brand-ink dark:hover:bg-brand-hover transition-colors whitespace-nowrap"
                  >
                    <span>Открыть контракт</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
