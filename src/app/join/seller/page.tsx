import JoinLanding from '@/components/public/JoinLanding'

export const metadata = {
  title: 'انضم كبائع مستقل | تسعيرك',
  description: 'بائع أو وسيط أو وكيل أسعار؟ قدّم أسعار مواد البناء من السوق عبر تسعيرك، بدون محل أو سجل تجاري.',
}

export default function JoinSellerPage() {
  return <JoinLanding kind="independent" />
}
