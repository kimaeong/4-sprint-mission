import ProductService from './ProductService.js';
import ArticleService from './ArticleService.js';

async function testProductAPI() {
  try {
    // 1. 상품 목록 조회
    const productList = await ProductService.getProductList({ page: 1, pageSize: 5, keyword: '' });
    console.log('[상품 목록]', productList);

    if (productList.length === 0) return;

    const sampleProductId = productList[0]._id;

    // 2. 상품 상세 조회
    const product = await ProductService.getProduct(sampleProductId);
    console.log('[상품 상세]', product);

    // 3. 상품 생성
    const newProduct = await ProductService.createProduct({
      name: '테스트 상품',
      description: '테스트 설명',
      price: 9999,
      tags: ['테스트', '전자제품'],
      images: ['https://via.placeholder.com/150']
    });
    console.log('[상품 생성]', newProduct);

    // 4. 상품 수정
    const updatedProduct = await ProductService.patchProduct(newProduct._id, {
      name: '수정된 테스트 상품',
      price: 10000
    });
    console.log('[상품 수정]', updatedProduct);

    // 5. 상품 삭제
    const deleted = await ProductService.deleteProduct(newProduct._id);
    console.log('[상품 삭제]', deleted);

  } catch (err) {
    console.error('[Product API 에러]', err.message);
  }
}
