import type { QuizScorePoint } from '@darb/shared';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatLocalDate } from '../../lib/dates';

// brand-600, validated for the light surface (see SubskillRadar); one series, so no legend.
const SERIES_COLOR = '#0d9488';
const GRID_COLOR = '#e7e5e4';
const AXIS_COLOR = '#57534e';

export function QuizScoreChart({ points }: { points: readonly QuizScorePoint[] }) {
  const { t, i18n } = useTranslation();
  const data = points.map((point) => ({
    ...point,
    day: formatLocalDate(point.completedAt.slice(0, 10), i18n.language),
  }));

  return (
    <figure>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: AXIS_COLOR, fontSize: 12 }} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => [`${String(value)}%`, t('progress.score')]} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: SERIES_COLOR }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="mt-2 space-y-1 text-sm">
          {data.map((point) => (
            <li
              key={`${point.skillId}-${point.title}-${point.completedAt}`}
              className="flex justify-between gap-4"
            >
              <span>
                {point.skill}: {point.title} <span className="text-stone-600">({point.day})</span>
              </span>
              <span className="font-semibold tabular-nums">{point.score}%</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
