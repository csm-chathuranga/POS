import { useNavigate, useParams } from 'react-router-dom';
import { useGetProductQuery, useUpdateProductMutation } from '../../features/products/productsApi';
import ProductForm from '../../components/products/ProductForm';

export default function ProductEdit() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { data: product, isLoading } = useGetProductQuery(id);
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  async function handleSubmit(data) {
    await updateProduct({ id, ...data }).unwrap();
    navigate('/products');
  }

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!product)  return <div className="p-6 text-slate-500">Product not found</div>;

  return (
    <div className="p-6">
      <ProductForm initial={product} onSubmit={handleSubmit} isSaving={isSaving} />
    </div>
  );
}
