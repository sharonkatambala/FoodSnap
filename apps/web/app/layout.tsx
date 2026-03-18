import "./../styles/globals.css";
import "./../styles/foodsnap-v2.css";
import Script from "next/script";

export const metadata = {
  title: "Lishe AI",
  description: "Take a photo of food and learn its nutrition with Lishe AI.",
  icons: {
    icon: "/icon.svg?v=7",
    shortcut: "/icon.svg?v=7",
    apple: "/icon.svg?v=7"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.7/dist/tf-tflite.min.js" strategy="afterInteractive" />
    </html>
  );
}
