import PageLayout from '../../components/PageLayout.jsx';

export default function ComingSoonPage({ title, description }) {
  return (
    <PageLayout title={title}>
      <h1>Coming Soon...</h1>
      {description && <p>{description}</p>}
    </PageLayout>
  );
}
