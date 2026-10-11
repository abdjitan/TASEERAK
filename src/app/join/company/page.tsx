import JoinLanding from '@/components/public/JoinLanding'

export const metadata = {
  title: 'انضم كشركة أو محل | تسعيرك',
  description: 'سجّل شركتك أو مصنعك أو محلك في تسعيرك واستقبل طلبات تسعير مواد البناء من المقاولين القريبين منك.',
}

export default function JoinCompanyPage() {
  return <JoinLanding kind="company" />
}
