import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { enqueueProductCreate } from '../../services/offlineQueue';

export default function ProductCreate() {
  const navigate = useNavigate();
  const { isOnline } = useConnectivity();
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [queued, setQueued] = useState(false);

  async function handleSubmit(data) {
    if (isOnline) {
      await createProduct(data).unwrap();
      navigate('/products');
    } else {
      setOfflineSaving(true);
      try {
        await enqueueProductCreate(data);
        setQueued(true);
        setTimeout(() => navigate('/products'), 900);
      } finally {
        setOfflineSaving(false);
      }
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-3">
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Offline — product will be saved locally and synced when you reconnect.
        </div>
      )}
      {queued && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          Saved offline. Syncing when online…
        </div>
      )}
      <ProductForm onSubmit={handleSubmit} isSaving={isLoading || offlineSaving} />
    </div>
  );
}
