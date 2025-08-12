import express from 'express'
import { PrismaClient } from '@prisma/client'
import { createComment } from '.../validate.js'
import { it, tr } from 'zod/locales'


const prisma = new PrismaClient // 클래스라서 new 키워드로 인스턴스를 만듦

const app = express()
app.use(express.json())


/*************comment***************/

// 1. 댓글 등록 API
// 댓글 등록 로직을 재사용 가능한 함수 생성
const createCommentHandler = async (req, res, parentKey) => { // parentKey 는 post api 코드에 따라 변형 되어서 사용 가능

    try {
        //  Zod 스키마로 요청 본문 유효성 검사
        const { content } = createComment.parse(req.body);
        const parentId = req.params[parentKey]; 
        const comment = await prisma.comment.create({
            data: {
                content,
                [parentKey]: parentId
            }
        });
        res.status(201).json(comment);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: '댓글 등록 중 오류가 발생했습니다.' });
    }
};

// 중고마켓용
app.post('/product/:productId/commnts', async (req, res) => { // 경로는 상품의 하나의 상품 중 댓글을 뜻 함
    await  createCommentHandler(req,res,'productId') // parentKey에 productId 담기
})

//자유 게시판용
app.post('/articles/:articleId/comments', async (req, res) => {
    await createCommentHandler(req, res, 'articleId');
});


// 2. 댓글 수정 API
// 댓글 수정 로직을 재사용 가능한 함수 생성
const updateCommentHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const { content } = commentSchema.parse(req.body);
        const updated = await prisma.comment.update({
            where: { id },
            data: { content },
        });
        res.status(200).json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }
};

app.patch('/comments/:id', async(req, res) => {
    await updateCommentHandler(req, res);
});


// 3. 댓글 삭제 API
// 댓글 삭제 로직을 재사용 가능한 함수 생성
const deleteCommentHandler = async (req,res) => {
    const { id } = req.params
    try{
        await prisma.comment.delete({
            where: { id }
        })
        res.status(200).json({ message: '댓글이 삭제 되었습니다'})
    } catch (error) {
        res.status(404).json({message: '삭제할 댓글을 찾을 수 없습니다.'})
    }
}

// 댓글 삭제 API
app.delete('/comments/:id', async(req, res) => {
    await deleteCommentHandler(req,res)
})


// 4. 댓글 목록 조회 API
/*id, content, createdAt 를 조회
cursor 방식의 페이지네이션 기능을 포함
중고마켓, 자유게시판 댓글 목록 조회 API를 따로 만들기.*/

const makeCursor = async({
    parentId,
    parentKey,
    cursor,
    limit = 10,
    older = 'recent'
}) => {
    // 1. 주문 정렬 방식 설정
    const orderBy = order === 'old'
    ?[{ createdAt: 'asc'}, { id : 'asc'}] // createdAt과 id를 함께 사용하여 고유성을 보장
    :[{ createdAt: 'desc'}, { id: 'desc'}]

    // 2.where 절을 동적으로 생성
    let whereCondition = { [parentKey]: parentId }

    if (cursor) {
        try {
            const cursorObject = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'))
            const isRecentOrder = order === 'recent'
            const comparisonOperator = isRecentOrder ? 'lt' : 'gt'

            whereCondition = {
                AND: [
                    whereCondition,
                    {
                        OR: [
                            { createdAt: { [comparisonOperator]: cursorObject.createdAt} },
                            {
                                AND: [
                                    { createdAt: {equals: cursorObject.createdAt }},
                                    { id : {[comparisonOperator]: cursorObject.id }}
                                ]
                            }
                        ]
                    }
                ]
            }
        } catch (e) {
            console.error('Invaild cursor format:', e)
            cursor = null
        }
    }

    //3. prisma를 사용하여 댓글을 조회
    const comments = await prisma.comment.findMany({
        where: whereCondition,
        orderBy,
        take: parseInt(limit) + 1,
        select : {
            id: true,
            content: true,
            createdAt: true,
        }
    })

    const hasNextPage = comments.length > limit
    const items = hasNextPage ? comments.slice(0, limit) : comments
    const lastItem = items.length > 0 ? items[items.length -1] : null

    const nextCursor = lastItem
        ?Buffer.from(JSON.stringify({
            id: lastItem.id,
            createdAt: lastItem.createdAt
        })).toString('base64')
        :null

    return {
        comments: items,
        hasNextPage,
        nextCursor
    }

}

// 중고마켓용
app.get('/products/:id/comments', async(req, res) => {
    const { id } = req.params
    const { cursor, limit, order } = req.query

    const result = await makeCursor({
        parentId: id,
        parentKey: 'productId',
        cursor,
        limit: parseInt(limit) || 10,
        order
    })
    res.status(200).json(result)
})

// 자유게시판용
app.get('/article/:id/comments', async(req,res) => {
    const { id } = req.params
    const { cursor, limit, order } = req.query

    const result = await makeCursor({
        parentId:  id,
        parentKey: 'articleId',
        cursor,
        limit: parseInt(limit) || 10,
        order
    })
    res.status(200).json(result)
})

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`${PORT}에서 서버 실행 중`);
});