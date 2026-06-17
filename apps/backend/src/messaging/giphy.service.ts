import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GiphyGif,
  GiphySearchResponse,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

// Helper for consistent error responses
const errorResponse = (code: string, message: string): ErrorResponse => ({
  success: false,
  error: { code, message },
});

interface GiphyApiImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyApiGif {
  id: string;
  title: string;
  images: {
    original: GiphyApiImage;
    fixed_width: GiphyApiImage;
    fixed_height_small: GiphyApiImage;
  };
}

interface GiphyApiResponse {
  data: GiphyApiGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
  };
}

@Injectable()
export class GiphyService {
  private readonly logger = new Logger(GiphyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.giphy.com/v1/gifs';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GIPHY_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn(
        'GIPHY_API_KEY not configured - Giphy features disabled',
      );
    }
  }

  /**
   * Search for GIFs by query
   */
  async search(
    query: string,
    limit = 25,
    offset = 0,
    rating: 'g' | 'pg' | 'pg-13' | 'r' = 'pg',
  ): Promise<SuccessResponse<GiphySearchResponse> | ErrorResponse> {
    if (!this.apiKey) {
      return errorResponse(
        'GIPHY_NOT_CONFIGURED',
        'Giphy API is not configured',
      );
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        q: query,
        limit: String(limit),
        offset: String(offset),
        rating,
        lang: 'en',
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`);

      if (!response.ok) {
        this.logger.error(
          `Giphy API error: ${response.status} ${response.statusText}`,
        );
        return errorResponse('GIPHY_API_ERROR', 'Failed to search GIFs');
      }

      const data: GiphyApiResponse = await response.json();

      return {
        success: true,
        data: this.transformResponse(data),
      };
    } catch (error) {
      this.logger.error('Giphy search error:', error);
      return errorResponse(
        'GIPHY_ERROR',
        'An error occurred while searching GIFs',
      );
    }
  }

  /**
   * Get trending GIFs
   */
  async trending(
    limit = 25,
    offset = 0,
    rating: 'g' | 'pg' | 'pg-13' | 'r' = 'pg',
  ): Promise<SuccessResponse<GiphySearchResponse> | ErrorResponse> {
    if (!this.apiKey) {
      return errorResponse(
        'GIPHY_NOT_CONFIGURED',
        'Giphy API is not configured',
      );
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        limit: String(limit),
        offset: String(offset),
        rating,
      });

      const response = await fetch(`${this.baseUrl}/trending?${params}`);

      if (!response.ok) {
        this.logger.error(
          `Giphy API error: ${response.status} ${response.statusText}`,
        );
        return errorResponse(
          'GIPHY_API_ERROR',
          'Failed to fetch trending GIFs',
        );
      }

      const data: GiphyApiResponse = await response.json();

      return {
        success: true,
        data: this.transformResponse(data),
      };
    } catch (error) {
      this.logger.error('Giphy trending error:', error);
      return errorResponse(
        'GIPHY_ERROR',
        'An error occurred while fetching trending GIFs',
      );
    }
  }

  /**
   * Get a single GIF by ID
   */
  async getById(giphyId: string): Promise<GiphyGif | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
      });

      const response = await fetch(`${this.baseUrl}/${giphyId}?${params}`);

      if (!response.ok) {
        return null;
      }

      const data: { data: GiphyApiGif } = await response.json();

      return this.transformGif(data.data);
    } catch (error) {
      this.logger.error(`Error fetching GIF ${giphyId}:`, error);
      return null;
    }
  }

  /**
   * Transform Giphy API response to our format
   */
  private transformResponse(response: GiphyApiResponse): GiphySearchResponse {
    return {
      gifs: response.data.map((gif) => this.transformGif(gif)),
      pagination: {
        totalCount: response.pagination.total_count,
        count: response.pagination.count,
        offset: response.pagination.offset,
      },
    };
  }

  /**
   * Transform a single Giphy API GIF to our format
   */
  private transformGif(gif: GiphyApiGif): GiphyGif {
    return {
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.fixed_width.url,
      width: parseInt(gif.images.original.width, 10),
      height: parseInt(gif.images.original.height, 10),
      previewWidth: parseInt(gif.images.fixed_width.width, 10),
      previewHeight: parseInt(gif.images.fixed_width.height, 10),
    };
  }
}
