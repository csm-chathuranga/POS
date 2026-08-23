import { useNavigate } from 'react-router-dom';
import { useCreateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';
import { useConnectivity } from '../../contexts/ConnectivityContext';

export default function ProductCreate() {
  const navigate = useNavigate();
  const { isOnline } = useConnectivity();
  const [createProduct, { isLoading }] = useCreateProductMutation();

  async function handleSubmit(data) {
    await createProduct(data).unwrap();
    navigate('/products');
  }

  if (!isOnline) {
    return (
      <div className="p-3 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Offline — adding products requires an internet connection.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-3">
      <ProductForm onSubmit={handleSubmit} isSaving={isLoading} />
    </div>
  );
}
