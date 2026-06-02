'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, IconButton, Drawer } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import { useRouter } from 'next/navigation';
import { TableOfContents, PRD_SECTIONS } from '@/components/docs/TableOfContents';
import { ExecutiveSummary } from '@/components/docs/sections/ExecutiveSummary';
import { ProblemStatement } from '@/components/docs/sections/ProblemStatement';
import { TargetUsers } from '@/components/docs/sections/TargetUsers';
import { GoalsMetrics } from '@/components/docs/sections/GoalsMetrics';
import { ProductOverview } from '@/components/docs/sections/ProductOverview';
import { FeatureInventory } from '@/components/docs/sections/FeatureInventory';
import { DataArchitecture } from '@/components/docs/sections/DataArchitecture';
import { RiskAppetiteFramework } from '@/components/docs/sections/RiskAppetiteFramework';
import { UserFlows } from '@/components/docs/sections/UserFlows';
import { ExportReporting } from '@/components/docs/sections/ExportReporting';
import { AIAssistant } from '@/components/docs/sections/AIAssistant';
import { AccessControl } from '@/components/docs/sections/AccessControl';
import { TechnicalStack } from '@/components/docs/sections/TechnicalStack';
import { NonFunctionalRequirements } from '@/components/docs/sections/NonFunctionalRequirements';
import { Roadmap } from '@/components/docs/sections/Roadmap';
import { Appendices } from '@/components/docs/sections/Appendices';
import { APP_VERSION } from '@/lib/version';

const TOC_WIDTH = 260;

export default function ProductDocumentationPage() {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>(PRD_SECTIONS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { root: contentEl, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );

    PRD_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
      setDrawerOpen(false);
    }
  }, []);

  const tocContent = (
    <TableOfContents activeId={activeSection} onNavigate={scrollToSection} />
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop ToC sidebar */}
      <Box
        sx={{
          width: TOC_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
          overflow: 'hidden',
        }}
      >
        {tocContent}
      </Box>

      {/* Mobile ToC drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { md: 'none' } }}
        PaperProps={{ sx: { width: TOC_WIDTH } }}
      >
        {tocContent}
      </Drawer>

      {/* Content area */}
      <Box
        ref={contentRef}
        sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 2, md: 5 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: 'none' }, mr: 0.5 }}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard')}
            sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, color: 'text.secondary' }}
          >
            Back to Dashboard
          </Button>

          <Box sx={{ flex: 1 }} />

          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #00897b 0%, #004d40 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Baobab Docs
          </Typography>

          <Typography
            sx={{
              fontSize: '0.68rem',
              color: 'text.disabled',
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            v{APP_VERSION}
          </Typography>
        </Box>

        {/* Document title */}
        <Box sx={{ px: { xs: 2, md: 5 }, pt: 4, pb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Documentation
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            Baobab Portfolio Monitor — Enterprise Lending Portfolio Risk Management Platform
          </Typography>
        </Box>

        {/* All sections */}
        <Box sx={{ px: { xs: 2, md: 5 }, pb: 8 }}>
          <ExecutiveSummary />
          <ProblemStatement />
          <TargetUsers />
          <GoalsMetrics />
          <ProductOverview />
          <FeatureInventory />
          <DataArchitecture />
          <RiskAppetiteFramework />
          <UserFlows />
          <ExportReporting />
          <AIAssistant />
          <AccessControl />
          <TechnicalStack />
          <NonFunctionalRequirements />
          <Roadmap />
          <Appendices />
        </Box>
      </Box>
    </Box>
  );
}
