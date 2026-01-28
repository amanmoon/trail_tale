import React from 'react';
import styles from './footer.module.css';
import Link from 'next/link';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>Trail Tale</div>
          <p className={styles.footerTagline}>
            Your memories, beautifully mapped.
          </p>
        </div>
        <div className={styles.footerLinks}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>Product</h4>
            <Link href="/gallery" className={styles.footerLink}>Open Map</Link>
            <Link href="/#features" className={styles.footerLink}>Features</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>About</h4>
            <a href="#" className={styles.footerLink}>Our Story</a>
            <a href="#" className={styles.footerLink}>Privacy</a>
          </div>
        </div>
      </div>

      <div className={styles.footerDivider}></div>

      <div className={styles.footerBottom}>
        <p className={styles.copyright}>
          © {currentYear} Trail Tale. All rights reserved.
        </p>
        <p className={styles.footerQuote}>
          &ldquo;The world is a book, and those who do not travel read only one page.&rdquo;
          <span className={styles.quoteAuthor}> — Saint Augustine</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;