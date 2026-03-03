'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDriverAuth } from '@/components/auth/require-driver-auth';
import { BackButton } from '@/components/ui/back-button';
import { PageLoading } from '@/components/ui/page-loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deliveryTasksApi, type CompletedTask } from '@/lib/api/delivery-tasks';
import { Package, RefreshCw, CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function DeliveryTasksHistoryPage() {
  const t = useTranslations('DeliveryTasks');
  const tOnboarding = useTranslations('Onboarding');
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const list = await deliveryTasksApi.getCompletedTasks();
      setTasks(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  };

  if (isLoading) {
    return (
      <RequireDriverAuth>
        <PageLoading fullPage />
      </RequireDriverAuth>
    );
  }

  return (
    <RequireDriverAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <BackButton href="/dashboard/delivery-tasks">{tOnboarding('back')}</BackButton>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                {t('historyTitle')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{t('historySubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && tasks.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t('noCompletedTasks')}
              </h2>
              <p className="text-gray-600 mb-4">{t('noCompletedTasksDescription')}</p>
              <Link
                href="/dashboard/delivery-tasks"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {t('myTasks')}
              </Link>
            </div>
          )}

          {!error && tasks.length > 0 && (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {t('order')} {task.order_number}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {t('deliveredAt')}: {formatDate(task.delivered_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireDriverAuth>
  );
}
