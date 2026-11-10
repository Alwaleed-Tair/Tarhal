import { type ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { useT } from '@/i18n/use-i18n';
import { setSeniorMode, updateSettings, useDemoState } from '@/store/demoStore';

export default function Settings() {
  const t = useT();
  const { settings } = useDemoState();
  const seniorMode = settings.largerText && settings.highContrast;

  return (
    <>
      <section className="page-panel settings-page">
        <PageHeader section={t('settings')} title={t('settingsTitle')} subtitle={t('preferencesSaved')} />
        <div className="settings-grid">
          <Setting title={t('language')} help={t('languageHelp')}>
            <div className="radio-row">
              <Choice selected={settings.language === 'en'} onClick={() => updateSettings({ language: 'en' })} label={t('english')} test="button-language-en" />
              <Choice selected={settings.language === 'ar'} onClick={() => updateSettings({ language: 'ar' })} label={t('arabic')} test="button-language-ar" />
            </div>
          </Setting>
          <Setting title={t('theme')} help={t('themeHelp')}>
            <div className="radio-row">
              <Choice selected={settings.theme === 'light'} onClick={() => updateSettings({ theme: 'light' })} label={t('light')} test="button-theme-light" />
              <Choice selected={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })} label={t('dark')} test="button-theme-dark" />
            </div>
          </Setting>
          <Setting title={t('seniorMode')} help={t('seniorModeHelp')} wide>
            <div className="radio-row">
              <Choice selected={seniorMode} onClick={() => setSeniorMode(!seniorMode)} label={t('seniorMode')} test="button-senior-mode-setting" />
            </div>
          </Setting>
          <Setting title={t('accessibility')} help={t('accessibilityHelp')}>
            <div className="radio-row">
              <Choice selected={settings.largerText} onClick={() => updateSettings({ largerText: !settings.largerText })} label={t('largerText')} test="button-larger-text" />
              <Choice selected={settings.highContrast} onClick={() => updateSettings({ highContrast: !settings.highContrast })} label={t('highContrast')} test="button-high-contrast" />
            </div>
          </Setting>
        </div>
      </section>
    </>
  );
}

function Setting({ title, help, wide = false, children }: { title: string; help: string; wide?: boolean; children: ReactNode }) {
  return <section className={`setting-card ${wide ? 'setting-card-wide' : ''}`}><h2>{title}</h2><p>{help}</p>{children}</section>;
}

function Choice({ selected, onClick, label, test }: { selected: boolean; onClick: () => void; label: string; test: string }) {
  return <button className={`radio-option ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected} data-testid={test}>{label}</button>;
}
