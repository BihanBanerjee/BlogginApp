import { Hono } from "hono";
import { verify } from 'hono/jwt'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { createBlogInput, updateBlogInput } from "@imbihan/medium-common";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  },
  Variables: {
    userId: string;
  }
}>();

blogRouter.use('/*', async (c, next) =>{
  const header = c.req.header("authorization") || "";
  const token = header.split(" ")[1];
  const secretKey = c.env.JWT_SECRET;
  const user = await verify(token, secretKey);
  try{
    if(user){
      c.set("userId", String(user.id));
      await next();
    }else{
      c.status(403);
      return c.json({ error: 'Unauthorized'});
    }
  } catch(e){
      c.status(403);
      return c.json({ error: 'Verify Token Failed'});
  }
})

blogRouter.post('/', async (c) => {
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await c.req.json();
  const authorId = c.get("userId");

  const { success } = createBlogInput.safeParse(body);
  if(!success) {
    c.status(403);
    return c.json({ error: 'Invalid Input'});
  }
  
  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(authorId)
    }
  })

  return c.json({
    id: blog.id
  })
})

blogRouter.put('/', async (c) => {
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if(!success) {
    c.status(403);
    return c.json({ error: 'Invalid Input'});
  }
  const blog = await prisma.blog.update({
    where: {
      id: body.id
    },
    data: {
      title: body.title,
      content: body.content
    }
  })
  
  return c.json({
    id: blog.id
  })
})


//Add pagination here...
blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const blogs = await prisma.blog.findMany({
      select: {
          content: true,
          title: true,
          id: true,
          author: {
              select: {
                  name: true
              }
          }
      }
  });
  return c.json({
    blogs
  });
});


blogRouter.get('/:id', async (c) => {
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  //const body = await c.req.json(); // You should never use body in get request. It doesnt make any sense.
 const id = c.req.param("id"); 
 try{
  const blog = await prisma.blog.findFirst({
    where: {
      id: Number(id)
    },
    select: {
      id: true,
      title: true,
      content: true,
      author: {
          select: {
              name: true
          }
       }
    }
  })
  
  return c.json({
    blog
  })
 } catch(e){
   c.status(411);
   return c.json({ error: 'Error while fetching blogpost!!!'});
 } 
})