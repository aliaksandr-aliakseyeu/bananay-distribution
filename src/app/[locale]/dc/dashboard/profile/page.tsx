'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RequireDcAuth } from '@/components/auth/require-dc-auth';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { dcApi, type DcProfile } from '@/lib/api/dc';
import { toast } from 'sonner';

export default function DcProfilePage() {
  const t = useTranslations('DcProfile');
  const [profile, setProfile] = useState<DcProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const me = await dcApi.getMe();
      setProfile(me);
      setFirstName(me.first_name ?? '');
      setLastName(me.last_name ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const updated = await dcApi.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setProfile(updated);
      toast.success(t('saveSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <RequireDcAuth>
        <PageLoading fullPage />
      </RequireDcAuth>
    );
  }

  return (
    <RequireDcAuth>
      <div className="w-full flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col min-h-0">
          <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <BackButton href="/dashboard">{t('back')}</BackButton>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
              <div>
                <Label htmlFor="first_name">{t('firstName')}</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('firstNamePlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last_name">{t('lastName')}</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('lastNamePlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input id="phone" value={profile?.phone_e164 ?? ''} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="dc">{t('distributionCenter')}</Label>
                <Input
                  id="dc"
                  value={profile?.distribution_center_name || t('notAssigned')}
                  disabled
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </RequireDcAuth>
  );
}
