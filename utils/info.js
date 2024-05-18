exports.displayModels = async () => {
    const responseInfo = await data.getResponseInfo();
    const models = new Set();
    responseInfo.forEach(r => {
        models.add(r.model)
    })

    console.log(models);
}

exports.displayLabelTypes = async () => {
    const responseInfo = await data.getResponseInfo();
    const labelTypes = new Set();
    responseInfo.forEach(r => {
        for (let i = 0; i < r.labels.length; ++i) {
            labelTypes.add(r.labels[i].label_type)
        }
    })

    console.log(labelTypes);
}

exports.displayTaskTypes = async () => {
    const sourceInfo = await data.getSourceInfo();
    const taskTypes = new Set();
    sourceInfo.forEach(s => {
        taskTypes.add(s.task_type)
    })

    console.log(taskTypes);
}
