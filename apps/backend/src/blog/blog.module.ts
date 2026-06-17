import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [CategoriesModule, TagsModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
