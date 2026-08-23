import { useNavigate, useParams } from 'react-router-dom';
import { useGetProductQuery, useUpdateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';
import { useLocale } from '../../contexts/LocaleContext';
import { useConnectivity } from '../../contexts/ConnectivityContext';

export default function ProductEdit() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { t }     = useLocale();
  const { isOnline } = useConnectivity();

  const { data: product, isLoading } = useGetProductQuery(id, { skip: !isOnline });
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  async function handleSubmit(data) {
    await updateProduct({ id, ...data }).unwrap();
    navigate('/products');
  }

  if (!isOnline) {
    return (
      <div className="p-3 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Offline — editing products requires an internet connection.
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 text-slate-500">{t('lbl.loading')}</div>;
  if (!product) return <div className="p-6 text-slate-500">{t('prod.no_products')}</div>;

  return (
    <div className="p-3 sm:p-6 space-y-3">
      <ProductForm
        initial={product}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}
