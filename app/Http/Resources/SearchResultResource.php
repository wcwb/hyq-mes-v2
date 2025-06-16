<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SearchResultResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'type' => $this->resource['type'],
            'title' => $this->resource['title'],
            'description' => $this->resource['description'] ?? '',
            'url' => $this->resource['url'] ?? '',
            'icon' => $this->resource['icon'] ?? '',
            'category' => $this->resource['category'] ?? '',
        ];
    }
}