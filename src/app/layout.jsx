import './globals.css';

export const metadata = {
  title: 'Ad Asset Editor',
  description: 'Create animated ad assets for Meta, Instagram, and Reddit',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
