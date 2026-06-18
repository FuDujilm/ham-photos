import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { usePublicSettings } from '../../hooks/useSettings';

export default function Footer() {
  const { data: settings } = usePublicSettings();

  const groups = settings?.footer_links ?? [];

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.3fr_2fr]">
          <div>
            <div className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              <Radio className="text-blue-600" size={24} />
              <span>{settings?.site_title ?? 'HAM Radio Gallery'}</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
              {settings?.site_subtitle ?? '展示业余无线电爱好者的精彩瞬间'}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}-${link.url}`}>
                      {link.url.startsWith('/') ? (
                        <Link to={link.url} className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-300">
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-600 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-300"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-gray-100 pt-5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {settings?.site_title ?? 'HAM Radio Gallery'}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {settings?.footer_icp && <span>{settings.footer_icp}</span>}
            {settings?.footer_police_record && <span>{settings.footer_police_record}</span>}
          </div>
        </div>
      </div>
    </footer>
  );
}
