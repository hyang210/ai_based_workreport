import { WorkOrderDetail } from '@/features/work-orders/WorkOrderDetail';

export default function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  return <WorkOrderDetail id={params.id} />;
}
