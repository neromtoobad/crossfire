export const metadata = {
  title: 'CROSSFIRE',
  description: 'Adversarial agents on a chain-enforced mandate.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
