'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Truck, FileText, Send } from 'lucide-react';

interface SubmitForReviewHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Подсказка для водителя: заполнить профиль, ТС, документы и отправить на модерацию.
 * Показывается каждый раз при заходе в личный кабинет, пока статус — черновик (без сохранения в хранилище).
 */
export function SubmitForReviewHelper({ isOpen, onClose }: SubmitForReviewHelperProps) {
  const t = useTranslations('Dashboard.submitHelper');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <User className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{t('profileStep')}</h4>
              <p className="text-sm text-gray-600">{t('profileStepDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
            <Truck className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{t('vehiclesStep')}</h4>
              <p className="text-sm text-gray-600">{t('vehiclesStepDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 border border-teal-100">
            <FileText className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{t('documentsStep')}</h4>
              <p className="text-sm text-gray-600">{t('documentsStepDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <Send className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{t('submitStep')}</h4>
              <p className="text-sm text-gray-600">{t('submitStepDesc')}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{t('gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
