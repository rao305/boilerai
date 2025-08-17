import './globals.css'

export const metadata = {
  title: 'Boiler AI - Mission Control',
  description: 'Privacy-first admin dashboard for Boiler AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}