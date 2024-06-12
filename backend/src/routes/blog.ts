import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@rohit1805/medium-common";
// export const blogRouter = new Hono<{
//   Bindings: {
//     DATABASE_URL: string;
//     JWT_SECRET: string;
//   };
//   Variables: {
//     userId: string;
//   };
// }>();

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

// blogRouter.use("/*", async (c, next) => {
//   const authHeader = c.req.header("authorization") || "";
//   const verifiedUser = verify(authHeader, c.env.JWT_SECRET);
//   if (verifiedUser) {
//     c.req.setData('userId', verifiedUser.id);
//     await next();
//   } else {
//     c.status(403);
//     return c.json({
//       message: "You are not logged in.",
//     });
//   }
// });

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  try {
    const user = await verify(authHeader, c.env.JWT_SECRET);
    if (user) {
      c.set("userId", user.id as string);
      await next();
    } else {
      c.status(403);
      return c.json({
        message: "You are not logged in",
      });
    }
  } catch (e) {
    c.status(403);
    return c.json({
      message: "You are not logged in",
    });
  }
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Incorrect inputs.",
    });
  }

  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: Number(authorId),
      },
    });

    return c.json({
      blog_id: blog.id,
    });
  } catch (e) {
    return c.text("Error while creating the blog.");
  }
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Incorrect inputs.",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.blog.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.json({
      msg: "Blog updated successfully.",
    });
  } catch (e) {
    return c.text("Error while updating the blog.");
  }
});

//todo: add pagination
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blogs = await prisma.blog.findMany();

    return c.json({
      blogs: blogs,
    });
  } catch (error) {
    return c.text("Error while getting the blog in bulk.");
  }
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.blog.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!blog) {
      c.status(400);
      return c.json({
        error: "Blog not found.",
      });
    }

    return c.json({
      blog: blog,
    });
  } catch (e) {
    return c.text("Error while getting the blog.");
  }
});
