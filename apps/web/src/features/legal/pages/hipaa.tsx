import LegalDocumentPage from '@/components/legal/legal-document-page';

const HipaaPage = () => {
  return (
    <LegalDocumentPage
      type="HIPAA_AUTHORIZATION"
      icon="shield"
      accentColor="blue"
    />
  );
};

export default HipaaPage;
