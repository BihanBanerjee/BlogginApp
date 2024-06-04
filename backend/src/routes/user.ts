import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign } from 'hono/jwt'
//import { signupInput } from '../../../common/src/index'; // we have published our own npm package that has zod types.
import { signupInput, signinInput } from '@imbihan/medium-common';
export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>();


userRouter.post('/signup', async (c) => { // c stands for context in Hono!
  const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);
  if(!success) {
    c.status(403);
    return c.json({ error: 'Invalid Input'});
  }
  try{ 
    // duplicate email checking.....
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name
      },
    })

    // gnerating JWT for authentication;

    const secretKey = c.env.JWT_SECRET;
    const token = await sign({ id: user.id }, secretKey)
    return c.json({
      jwt: token
    })
  } catch(e) {
    c.status(403);
    return c.json({ error: 'User already exists'});
  }  
})

userRouter.post('/signin', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
  if(!success) {
    c.status(403);
    return c.json({ error: 'Invalid Input'});
  }
  const user = await prisma.user.findUnique({
    where: {
      username: body.username,
      password: body.password,
    }
  });

  if(!user){
    c.status(403);
    return c.json({ error: 'Invalid Credentials!!!'});
  }

  const secretKey = c.env.JWT_SECRET;
  const jwt = await sign({id: user.id}, secretKey);
  return c.json({jwt}); 
})