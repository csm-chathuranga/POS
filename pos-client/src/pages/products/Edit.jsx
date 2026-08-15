import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGetProductQuery, useUpdateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';
import { useLocale } from '../../contexts/LocaleContext';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { enqueueProductEdit } from '../../services/offlineQueue';
import { getLocalProducts } from '../../services/cacheSync';

export default function ProductEdit() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { t }     = useLocale();
  const { isOnline } = useConnectivity();

  // Online: fetch from server. Offline: load from Dexie.
  const { data: serverProduct, isLoading } = useGetProductQuery(id, { skip: !isOnline });
  const [localProduct, setLocalProduct]    = useState(null);
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();
  const [offlineSaving, setOfflineSaving]  = useState(false);
  const [queued, setQueued]                = useState(false);

  useEffect(() => {
    if (!isOnline) {
      getLocalProducts().then(all => {
        const p = all.find(p => String(p.id) === String(id));
        setLocalProduct(p ?? null);
      });
    }
  }, [isOnline, id]);

  const product = isOnline ? serverProduct : localProduct;
  const loading = isOnline ? isLoading : !localProduct && !queued;

  async function handleSubmit(data) {
    if (isOnline) {
      await updateProduct({ id, ...data }).unwrap();
      navigate('/products');
    } else {
      setOfflineSaving(true);
      try {
        await enqueueProductEdit(Number(id), data);
        setQueued(true);
        // Brief confirmation then navigate back
        setTimeout(() => navigate('/products'), 900);
      } finally {
        setOfflineSaving(false);
      }
    }
  }

  if (loading) return <div className="p-6 text-slate-500">{t('lbl.loading')}</div>;
  if (!product) return <div className="p-6 text-slate-500">{t('prod.no_products')}</div>;

  return (
    <div className="p-3 sm:p-6 space-y-3">
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Offline — changes will sync automatically when you reconnect.
        </div>
      )}
      {queued && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          Saved offline. Syncing when online…
        </div>
      )}
      <ProductForm
        initial={product}
        onSubmit={handleSubmit}
        isSaving={isSaving || offlineSaving}
      />
    </div>
  );
}
