'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { driverApi } from '@/lib/api/driver';

interface CreateVehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateVehicleDialog({ isOpen, onClose, onSuccess }: CreateVehicleDialogProps) {
  const t = useTranslations('Onboarding');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    model: '',
    capacity_kg: '',
    capacity_m3: '',
    body_type: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [stsFile, setStsFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const capacity_kg = parseInt(formData.capacity_kg, 10);
      const capacity_m3 = parseFloat(formData.capacity_m3);
      if (isNaN(capacity_kg) || capacity_kg < 1 || capacity_kg > 50000) {
        setError(t('createError'));
        setIsLoading(false);
        return;
      }
      if (isNaN(capacity_m3) || capacity_m3 < 0 || capacity_m3 > 1000) {
        setError(t('createError'));
        setIsLoading(false);
        return;
      }
      const vehicle = await driverApi.createVehicle({
        plate_number: formData.plate_number.trim(),
        model: formData.model.trim() || null,
        capacity_kg,
        capacity_m3,
        body_type: formData.body_type.trim() || null,
      });
      if (photoFile) {
        await driverApi.uploadVehiclePhoto(vehicle.id, photoFile);
      }
      if (stsFile) {
        await driverApi.uploadVehicleSts(vehicle.id, stsFile);
      }
      setFormData({ plate_number: '', model: '', capacity_kg: '', capacity_m3: '', body_type: '' });
      setPhotoFile(null);
      setStsFile(null);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('createError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ plate_number: '', model: '', capacity_kg: '', capacity_m3: '', body_type: '' });
    setPhotoFile(null);
    setStsFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('createVehicle')}</DialogTitle>
          <DialogDescription>{t('vehiclesDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="plate_number">{t('plateNumber')} *</Label>
            <Input
              id="plate_number"
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
              placeholder={t('plateNumberPlaceholder')}
              required
              maxLength={20}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">{t('model')}</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder={t('modelPlaceholder')}
              maxLength={255}
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="capacity_kg">{t('capacityKg')} *</Label>
              <Input
                id="capacity_kg"
                type="number"
                min={1}
                max={50000}
                value={formData.capacity_kg}
                onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity_m3">{t('capacityM3')} *</Label>
              <Input
                id="capacity_m3"
                type="number"
                min={0}
                max={1000}
                step="0.01"
                value={formData.capacity_m3}
                onChange={(e) => setFormData({ ...formData, capacity_m3: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="body_type">{t('bodyType')}</Label>
            <Input
              id="body_type"
              value={formData.body_type}
              onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
              placeholder={t('bodyTypePlaceholder')}
              maxLength={50}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_photo">{t('vehiclePhoto')}</Label>
            <Input
              id="vehicle_photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {photoFile && (
              <p className="text-sm text-muted-foreground">{photoFile.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_sts">{t('documentSts')}</Label>
            <Input
              id="vehicle_sts"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setStsFile(e.target.files?.[0] ?? null)}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {stsFile && (
              <p className="text-sm text-muted-foreground">{stsFile.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('creating') : t('addVehicle')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
