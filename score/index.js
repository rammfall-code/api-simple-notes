import { Type } from '@sinclair/typebox';
import { faker } from '@faker-js/faker';

let scores = new Array(20).fill(10).map(() => {
  return {
    id: crypto.randomUUID(),
    note: faker.food.dish(),
    score: faker.number.int({ min: 1, max: 12 }),
  };
});

const scoreSearchPayload = Type.Object(
  {
    query: Type.Optional(
      Type.String({
        minLength: 4,
        maxLength: 100,
      }),
    ),
  },
  {
    $id: 'SearchParams',
  },
);

const scoreSchema = Type.Object(
  {
    id: Type.String(),
    note: Type.String({
      minLength: 4,
      maxLength: 100,
    }),
    score: Type.Number({
      minimum: 1,
      maximum: 12,
    }),
  },
  {
    $id: 'Score',
  },
);

const scoreList = Type.Array(scoreSchema, {
  $id: 'ScoreList',
});

const createSchema = Type.Pick(scoreSchema, ['note', 'score'], {
  $id: 'CreateScore',
});

const idPayload = Type.Pick(scoreSchema, ['id'], {
  $id: 'ScoreId',
});

export const scoreModule = (instance, opts, done) => {
  instance.addSchema(scoreSchema);
  instance.addSchema(scoreList);
  instance.addSchema(scoreSearchPayload);
  instance.addSchema(createSchema);
  instance.addSchema(idPayload);

  instance.get(
    '',
    {
      schema: {
        tags: ['Score'],
        querystring: Type.Ref(scoreSearchPayload),
        response: {
          200: Type.Ref(scoreList),
        },
      },
    },
    (request, reply) => {
      if (!request.query.query) {
        return scores;
      }

      return scores.filter((score) =>
        score.note.toLowerCase().includes(request.query.query.toLowerCase()),
      );
    },
  );

  instance.post(
    '',
    {
      schema: {
        tags: ['Score'],
        body: Type.Ref(createSchema),
        response: {
          201: Type.Ref(scoreSchema),
        },
      },
    },
    (request, reply) => {
      const newItem = {
        id: crypto.randomUUID(),
        note: request.body.note,
        score: request.body.score,
      };

      scores.push(newItem);

      return reply.status(201).send(newItem);
    },
  );

  instance.patch(
    '/:id',
    {
      schema: {
        tags: ['Score'],
        params: Type.Ref(idPayload),
        body: Type.Ref(createSchema),
        response: {
          200: Type.Ref(scoreSchema),
        },
      },
    },
    (request, reply) => {
      const score = scores.find((score) => score.id === request.params.id);

      if (!score) {
        return reply.status(400).send({ message: 'Score does not exist' });
      }

      scores = scores.map((score) => {
        if (score.id !== request.params.id) {
          return score;
        }

        return {
          ...score,
          note: request.body.note,
          score: request.body.score,
        };
      });

      return score;
    },
  );

  instance.delete(
    '/:id',
    {
      schema: {
        tags: ['Score'],
        params: Type.Ref(idPayload),
        response: {
          200: Type.Ref(scoreSchema),
        },
      },
    },
    (request, reply) => {
      const score = scores.find((score) => score.id === request.params.id);

      if (!score) {
        return reply.status(400).send({ message: 'Score does not exist' });
      }

      scores = scores.filter((score) => score.id !== request.params.id);

      return score;
    },
  );

  done();
};
