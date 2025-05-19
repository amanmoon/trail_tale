import React from 'react';
import styles from './footer.module.css'; 

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const quote = "The world is a book, and those who do not travel read only one page."; 

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLeft}>
          <p className={styles.footerQuote}>&ldquo;{quote}&rdquo;</p>
          <p className={styles.quoteAuthor}>&ndash; Saint Augustine</p>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerLogo}>Trail Tale</div>
          <p className={styles.copyright}>
            &copy; {currentYear} Trail Tale. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;