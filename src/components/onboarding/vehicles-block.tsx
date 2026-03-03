'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  VehicleCard,
  CreateVehicleDialog,
  EditVehicleDialog,
  DeleteVehicleDialog,
} from '@/components/vehicle';
import { PageLoading } from '@/components/ui/page-loading';
import { driverApi, type DriverVehicleResponse } from '@/lib/api/driver';
import { toast } from 'sonner';

interface VehiclesBlockProps {
  /** When set, use this data and do not load on mount (avoids duplicate spinners). */
  initialVehicles?: DriverVehicleResponse[];
  /** Called when list should be refetched (e.g. after create/edit/delete). */
  onVehiclesUpdated?: () => void;
}

export function VehiclesBlock({ initialVehicles, onVehiclesUpdated }: VehiclesBlockProps) {
  const t = useTranslations('Onboarding');
  const [vehicles, setVehicles] = useState<DriverVehicleResponse[]>(initialVehicles ?? []);
  const [isLoading, setIsLoading] = useState(initialVehicles === undefined);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<DriverVehicleResponse | null>(null);
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialVehicles !== undefined) {
      setVehicles(initialVehicles);
      setIsLoading(false);
      return;
    }
    load();
  }, []);

  useEffect(() => {
    if (initialVehicles !== undefined) {
      setVehicles(initialVehicles);
    }
  }, [initialVehicles]);

  const load = async () => {
    try {
      const list = await driverApi.getVehicles();
      setVehicles(list);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => (onVehiclesUpdated ? onVehiclesUpdated() : load());

  const handleDeleteVehicle = async () => {
    if (!deleteVehicleId) return;
    setIsDeleting(true);
    try {
      await driverApi.deleteVehicle(deleteVehicleId);
      setDeleteVehicleId(null);
      await refresh();
      toast.success(t('deleteVehicle'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <PageLoading fullPage={false} />;
  }

  return (
    <>
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{t('vehicles')}</CardTitle>
            <CardDescription>{t('vehiclesDescription')}</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreateVehicle(true)}>
            {t('addVehicle')}
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-gray-500 py-4">{t('emptyVehicles')}</p>
          ) : (
            <div className="space-y-3 overflow-visible pt-px">
              {vehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  onEdit={setEditingVehicle}
                  onDelete={setDeleteVehicleId}
                  isDeleting={deleteVehicleId === v.id && isDeleting}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateVehicleDialog
        isOpen={showCreateVehicle}
        onClose={() => setShowCreateVehicle(false)}
        onSuccess={refresh}
      />
      <EditVehicleDialog
        isOpen={editingVehicle !== null}
        onClose={() => setEditingVehicle(null)}
        onSuccess={refresh}
        vehicle={editingVehicle}
      />
      <DeleteVehicleDialog
        isOpen={deleteVehicleId !== null}
        onClose={() => setDeleteVehicleId(null)}
        onConfirm={handleDeleteVehicle}
        isLoading={isDeleting}
      />
    </>
  );
}
