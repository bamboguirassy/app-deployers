import { WebhookConfig } from '@/types/models';
import { Webhook } from 'lucide-react';
import { useState } from 'react';

const PROVIDER_LOGOS: Record<WebhookConfig['provider'], string> = {
    github: 'https://cdn.simpleicons.org/github/ffffff',
    gitlab: 'https://cdn.simpleicons.org/gitlab/FC6D26',
    bitbucket: 'https://cdn.simpleicons.org/bitbucket/2684FF',
};

export default function ProviderLogo({ provider, size = 18 }: { provider: WebhookConfig['provider']; size?: number }) {
    const [failed, setFailed] = useState(false);

    return (
        <span className="provider-logo-badge" style={{ width: size + 10, height: size + 10 }}>
            {failed ? (
                <Webhook size={size} />
            ) : (
                <img
                    src={PROVIDER_LOGOS[provider]}
                    alt={provider}
                    width={size}
                    height={size}
                    loading="lazy"
                    onError={() => setFailed(true)}
                />
            )}
        </span>
    );
}
