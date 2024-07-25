import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    myVariantTypo1: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    myVariantTypo1?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    myVariantTypo1: true;
  }
}
