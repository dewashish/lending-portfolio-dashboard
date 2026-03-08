'use client';

import { Box, Typography, Divider } from '@mui/material';

interface Props {
  id: string;
  title: string;
  sectionNumber: number;
  children: React.ReactNode;
}

export function PRDSection({ id, title, sectionNumber, children }: Props) {
  return (
    <Box id={id} sx={{ scrollMarginTop: '24px', mb: 6 }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 0.5, fontSize: '1.25rem' }}
      >
        {sectionNumber}. {title}
      </Typography>
      <Divider sx={{ mb: 2.5 }} />
      {children}
    </Box>
  );
}
