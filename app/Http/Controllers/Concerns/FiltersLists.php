<?php

namespace App\Http\Controllers\Concerns;

trait FiltersLists
{
    protected function applySearch($query, ?string $term, array $columns)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term, $columns) {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', "%{$term}%");
            }
        });
    }

    protected function applySort($query, ?string $sort, ?string $direction, array $allowed, string $defaultField, string $defaultDirection = 'desc')
    {
        $direction = in_array($direction, ['asc', 'desc'], true) ? $direction : $defaultDirection;
        $field = in_array($sort, $allowed, true) ? $sort : $defaultField;

        return $query->orderBy($field, $direction);
    }

    protected function perPage(mixed $value, int $default = 15, int $max = 100): int
    {
        $value = (int) $value;

        return $value >= 1 && $value <= $max ? $value : $default;
    }
}
