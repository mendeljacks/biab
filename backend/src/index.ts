process.on('unhandledRejection', err => {
    console.log(err)
})

export const handler = promiseFn => (req, res) =>
    promiseFn(req, res)
        .then(result => res.status(200).send(result))
        .catch(err => res.status(400).send(err))
