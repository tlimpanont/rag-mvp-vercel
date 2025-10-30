export const metadata = {
  title: 'RAG MVP',
  description: 'Retrieval-Augmented Generation Service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
