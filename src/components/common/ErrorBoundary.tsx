'use client';

import React from 'react';
import { Card, Typography, Button } from '@mui/material';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card sx={{ p: 3, border: '1px solid', borderColor: 'error.main' }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {this.state.error?.message}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => this.setState({ hasError: false })}>
            Retry
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
