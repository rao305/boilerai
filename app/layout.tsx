import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BoilerAI - Your Private Academic Assistant',
  description: 'AI-powered academic planning and transcript analysis for Purdue University students',
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
